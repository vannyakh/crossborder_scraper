"""Run API server: python -m server  OR  uv run serve"""

import os

import uvicorn

from config import get_settings
from core.paths import repo_root


def main() -> None:
    reload = os.getenv("UVICORN_RELOAD", "1").lower() in ("1", "true", "yes")
    settings = get_settings()
    root = repo_root()
    uvicorn.run(
        "server.app:app",
        host=settings.panel_host,
        port=settings.panel_port,
        reload=reload,
        reload_dirs=[str(root / "src"), str(root / "config")],
        reload_excludes=[
            "**/node_modules/**",
            "**/.git/**",
            "**/apps/web/**",
            "**/data/**",
        ],
    )


if __name__ == "__main__":
    main()
