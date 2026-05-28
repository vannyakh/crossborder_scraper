"""Static file serving with SPA fallback for client-side routes."""

from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles

_ASSET_SUFFIXES = frozenset(
    {
        ".css",
        ".gif",
        ".ico",
        ".jpeg",
        ".jpg",
        ".js",
        ".json",
        ".map",
        ".png",
        ".svg",
        ".txt",
        ".webp",
        ".woff",
        ".woff2",
        ".xml",
    }
)


class SPAStaticFiles(StaticFiles):
    """Serve static assets; unknown non-asset paths fall back to index.html."""

    async def get_response(self, path: str, scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or not _should_spa_fallback(path):
                raise
            return await super().get_response("index.html", scope)


def _should_spa_fallback(path: str) -> bool:
    suffix = Path(path.split("?", 1)[0]).suffix.lower()
    return suffix not in _ASSET_SUFFIXES
