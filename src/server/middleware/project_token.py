"""Project-scoped Bearer token auth for /projects/{id}/* routes."""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from server.projects.settings_store import verify_project_token

_PROJECT_PATH = re.compile(r"^/projects/(?P<project_id>[^/]+)(?:/(?P<sub>.+))?$")


def _extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return None


def project_token_allowed(path: str) -> tuple[str, bool] | None:
    """Return (project_id, True) when a project Bearer token may authorize this path."""
    match = _PROJECT_PATH.match(path)
    if not match:
        return None
    project_id = match.group("project_id")
    sub = match.group("sub") or ""
    if project_id in ("templates", "plugin-profiles", "presence"):
        return None
    if sub.startswith("settings/tokens"):
        return None
    return project_id, True


class ProjectTokenAuthMiddleware(BaseHTTPMiddleware):
    """Accept ``Authorization: Bearer <project-token>`` on project-scoped HTTP routes."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        allowed = project_token_allowed(request.url.path)
        if allowed:
            project_id, _ok = allowed
            raw = _extract_bearer_token(request)
            if raw:
                entry = verify_project_token(project_id, raw)
                if entry:
                    label = str(entry.get("label") or "API token")
                    request.state.project_token_auth = f"token:{label}"
                    request.state.project_token_id = str(entry.get("id") or "")
        return await call_next(request)


def add_project_token_middleware(app) -> None:
    app.add_middleware(ProjectTokenAuthMiddleware)
