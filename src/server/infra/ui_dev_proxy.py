"""Proxy /ui to the Vite dev server when production assets are not built."""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse

_DEFAULT_VITE_PORT = 5173
_HOP_BY_HOP = frozenset({
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
})


def vite_dev_base_url() -> str:
    explicit = os.getenv("PANEL_UI_DEV_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    port = int(os.getenv("PANEL_UI_DEV_PORT", str(_DEFAULT_VITE_PORT)))
    return f"http://127.0.0.1:{port}"


def create_ui_dev_router() -> APIRouter:
    router = APIRouter(include_in_schema=False)

    @router.api_route("", methods=["GET", "HEAD", "OPTIONS"])
    @router.api_route("/{path:path}", methods=["GET", "HEAD", "OPTIONS"])
    async def proxy_ui(request: Request, path: str = "") -> Response:
        return await _proxy_to_vite(request, path)

    return router


async def _proxy_to_vite(request: Request, path: str) -> Response:
    base = vite_dev_base_url()
    suffix = path.lstrip("/")
    target = f"{base}/ui/{suffix}" if suffix else f"{base}/ui/"
    if request.url.query:
        target = f"{target}?{request.url.query}"

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _HOP_BY_HOP and key.lower() != "host"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.request(
                request.method,
                target,
                headers=headers,
                follow_redirects=False,
            )
    except httpx.ConnectError:
        return _vite_not_running_response()

    resp_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in _HOP_BY_HOP
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


def _vite_not_running_response() -> HTMLResponse:
    vite_url = vite_dev_base_url()
    return HTMLResponse(
        f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Panel UI (development)</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;
margin:3rem auto;padding:0 1rem;line-height:1.5">
<h1>Panel UI (development)</h1>
<p>Production assets are not built and the Vite dev server is not running.</p>
<ol>
<li>In a second terminal: <code>bash scripts/dev-ui.sh</code></li>
<li>Refresh this page, or open <a href="{vite_url}/ui/">{vite_url}/ui/</a></li>
</ol>
<p>Or build for production: <code>cd apps/web &amp;&amp; pnpm build</code></p>
</body>
</html>""",
        status_code=503,
    )
