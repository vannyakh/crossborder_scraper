"""Run API server: python -m server  OR  uv run serve"""

import os

import uvicorn

from config import get_settings
from core.paths import repo_root


def main() -> None:
    reload = os.getenv("UVICORN_RELOAD", "1").lower() in ("1", "true", "yes")
    settings = get_settings()
    root = repo_root().resolve()
    kwargs: dict = {
        "host": settings.panel_host,
        "port": settings.panel_port,
    }
    if reload:
        # Watch only Python + runtime config. Do not pass reload_excludes — uvicorn
        # globs the whole repo for exclude patterns (slow; pathlib edge cases on macOS).
        kwargs["reload"] = True
        kwargs["reload_dirs"] = [str(root / "src"), str(root / "config")]
    uvicorn.run("server.app:app", **kwargs)


if __name__ == "__main__":
    main()
