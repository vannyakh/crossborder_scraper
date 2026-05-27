"""Single source for service version and process start time."""

from datetime import datetime


def _read_app_version() -> str:
    try:
        from importlib.metadata import version

        return version("crossborder-scraper")
    except Exception:
        pass
    try:
        import tomllib
        from pathlib import Path

        pyproject = Path(__file__).resolve().parents[3] / "pyproject.toml"
        if pyproject.is_file():
            data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
            return str(data.get("project", {}).get("version", "0.1.0"))
    except Exception:
        pass
    return "0.1.0"


APP_VERSION = _read_app_version()
SERVICE_STARTED_AT = datetime.utcnow()
