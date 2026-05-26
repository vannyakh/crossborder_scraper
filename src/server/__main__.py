"""Run API server: python -m server  OR  uv run serve"""

import os

import uvicorn

from config import get_settings


def main() -> None:
    reload = os.getenv("UVICORN_RELOAD", "1").lower() in ("1", "true", "yes")
    settings = get_settings()
    uvicorn.run(
        "server.app:app",
        host=settings.panel_host,
        port=settings.panel_port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
