"""Run API server: python -m server  OR  uv run serve"""

import os

import uvicorn


def main() -> None:
    reload = os.getenv("UVICORN_RELOAD", "1").lower() in ("1", "true", "yes")
    uvicorn.run(
        "server.app:app",
        host="0.0.0.0",
        port=8000,
        reload=reload,
    )


if __name__ == "__main__":
    main()
