"""Hide the panel behind a secret URL path; require access key before login/API."""

from __future__ import annotations

from starlette.requests import Request
from starlette.responses import RedirectResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from deploy.panel_security import (
    COOKIE_NAME,
    access_keys_match,
    effective_entry_path,
    expected_entrance_cookie,
)
from server.middleware.panel_entrance_html import (
    panel_not_found_response,
    panel_server_error_response,
)

_LOCAL_HOSTS = frozenset({"127.0.0.1", "::1", "localhost", "testclient"})


def _is_static_ui_asset(path: str) -> bool:
    if path.startswith("/ui/assets/"):
        return True
    if path.startswith("/ui/images/"):
        return True
    if path.startswith("/ui/lottie/"):
        return True
    return path in (
        "/ui/favicon.ico",
        "/ui/favicon.svg",
        "/ui/vite.svg",
        "/ui/icons.svg",
    )


def _is_unprefixed_ui_static(path: str) -> bool:
    """Vite production build uses absolute /ui/assets/ paths (no entrance prefix)."""
    return _is_static_ui_asset(path)


def _needs_access_gate(path: str) -> bool:
    if path == "/health":
        return False
    if _is_static_ui_asset(path):
        return False
    if path.startswith("/ui"):
        return True
    if path.startswith("/auth"):
        return True
    return path not in ("/", "")


class PanelEntranceMiddleware:
    """ASGI middleware — mutates scope path so routing sees stripped entrance prefix."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        entry_path: str,
        access_key: str | None,
    ) -> None:
        self.app = app
        self.entry_path = entry_path
        self.access_key = (access_key or "").strip() or None
        self._cookie_expected = (
            expected_entrance_cookie(self.access_key) if self.access_key else None
        )
        self._prefix = f"/{entry_path}"

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        path = scope.get("path", "")

        try:
            await self._handle_http(request, scope, path, receive, send)
        except Exception:
            response = panel_server_error_response(request, entry_prefix=self._prefix)
            await response(scope, receive, send)

    async def _handle_http(
        self,
        request: Request,
        scope: Scope,
        path: str,
        receive: Receive,
        send: Send,
    ) -> None:
        if self._local_health_bypass(request, path):
            await self.app(scope, receive, send)
            return

        # Production UI references /ui/assets/* without the secret entrance prefix.
        if _is_unprefixed_ui_static(path):
            await self.app(scope, receive, send)
            return

        if path in ("", "/") or (not path.startswith(self._prefix + "/") and path != self._prefix):
            response = panel_not_found_response(request, entry_prefix=self._prefix)
            await response(scope, receive, send)
            return

        inner_scope = self._scope_with_stripped_path(scope, path)
        inner_path = inner_scope.get("path", "/")

        if self.access_key and _needs_access_gate(inner_path):
            if not self._has_entrance_access(request):
                response = panel_not_found_response(request, entry_prefix=self._prefix)
                await response(scope, receive, send)
                return

        if inner_path in ("", "/") and self._has_entrance_access(request):
            login = f"{self._prefix}/ui/login"
            if request.url.query:
                login = f"{login}?{request.url.query}"
            response = RedirectResponse(url=login, status_code=302)
            await response(scope, receive, send)
            return

        if self._should_set_access_cookie(request):
            await self._app_with_cookie(inner_scope, receive, send)
            return

        await self.app(inner_scope, receive, send)

    def _scope_with_stripped_path(self, scope: Scope, path: str) -> Scope:
        if path == self._prefix:
            new_path = "/"
        else:
            new_path = path[len(self._prefix) :] or "/"
        inner = dict(scope)
        inner["path"] = new_path
        inner["raw_path"] = new_path.encode("utf-8")
        return inner

    def _client_host(self, request: Request) -> str:
        if request.client:
            return request.client.host
        return ""

    def _local_health_bypass(self, request: Request, path: str) -> bool:
        return path == "/health" and self._client_host(request) in _LOCAL_HOSTS

    def _has_entrance_access(self, request: Request) -> bool:
        if not self.access_key:
            return True
        query_key = request.query_params.get("access_key", "")
        if access_keys_match(query_key, self.access_key):
            return True
        cookie = request.cookies.get(COOKIE_NAME, "")
        if cookie and self._cookie_expected and access_keys_match(cookie, self._cookie_expected):
            return True
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("basic "):
            return True
        return False

    def _should_set_access_cookie(self, request: Request) -> bool:
        if not self.access_key:
            return False
        key = request.query_params.get("access_key", "")
        return access_keys_match(key, self.access_key)

    async def _app_with_cookie(self, scope: Scope, receive: Receive, send: Send) -> None:
        cookie_value = self._cookie_expected or ""

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                cookie = (
                    f"{COOKIE_NAME}={cookie_value}; Path={self._prefix}/; "
                    f"HttpOnly; SameSite=Lax; Max-Age=2592000"
                )
                headers.append((b"set-cookie", cookie.encode("latin-1")))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)


def add_panel_entrance_middleware(app: ASGIApp) -> None:
    from config import get_settings

    settings = get_settings()
    entry = effective_entry_path(settings.panel_entry_path)
    if not entry:
        return
    app.add_middleware(
        PanelEntranceMiddleware,
        entry_path=entry,
        access_key=settings.panel_access_key,
    )
