"""Panel access credentials — auto-generate and persist to .env on first setup."""

from __future__ import annotations

import secrets
import string
from pathlib import Path

from loguru import logger

_ENV_KEYS = ("PANEL_USERNAME", "PANEL_PASSWORD", "PANEL_AUTH_ENABLED")


def _repo_env_path() -> Path:
    return Path(__file__).resolve().parents[2] / ".env"


def _generate_username() -> str:
    suffix = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"scraper_{suffix}"


def _generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def upsert_env_file(env_path: Path, updates: dict[str, str]) -> None:
    """Merge key=value pairs into .env without removing unrelated lines."""
    lines: list[str] = []
    seen: set[str] = set()

    if env_path.exists():
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            stripped = raw.strip()
            if not stripped or stripped.startswith("#") or "=" not in raw:
                lines.append(raw)
                continue
            key = raw.split("=", 1)[0].strip()
            if key in updates:
                lines.append(f"{key}={updates[key]}")
                seen.add(key)
            else:
                lines.append(raw)

    if env_path.exists() and lines and not lines[-1].strip():
        pass
    elif lines and lines[-1].strip():
        lines.append("")

    panel_section_exists = any("PANEL_" in ln for ln in lines)
    new_panel_lines = [k for k in updates if k.startswith("PANEL_") and k not in seen]
    if new_panel_lines and not panel_section_exists:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append("# Panel UI access (auto-generated on setup)")

    for key, value in updates.items():
        if key not in seen:
            lines.append(f"{key}={value}")

    env_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def ensure_panel_credentials(
    env_path: Path | None = None,
    *,
    force_regenerate: bool = False,
) -> tuple[str, str, bool]:
    """
    Ensure PANEL_USERNAME and PANEL_PASSWORD exist in .env.

    Returns (username, password, was_generated).
  """
    env_path = env_path or _repo_env_path()

    from config.settings import Settings

    if not force_regenerate:
        settings = Settings()
        if settings.panel_username and settings.panel_password:
            return settings.panel_username, settings.panel_password, False

    username = _generate_username()
    password = _generate_password()

    if not env_path.exists() and (env_path.parent / ".env.example").exists():
        example = env_path.parent / ".env.example"
        env_path.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")

    upsert_env_file(
        env_path,
        {
            "PANEL_AUTH_ENABLED": "true",
            "PANEL_USERNAME": username,
            "PANEL_PASSWORD": password,
        },
    )

    logger.info("Generated panel credentials → {}", env_path)
    return username, password, True


def print_panel_credentials(username: str, password: str, *, env_path: Path | None = None) -> None:
    path = env_path or _repo_env_path()
    banner = (
        "\n"
        "╔══════════════════════════════════════════════════╗\n"
        "║       Crossborder Scraper — Panel Access         ║\n"
        "╠══════════════════════════════════════════════════╣\n"
        f"║  Username: {username:<36} ║\n"
        f"║  Password: {password:<36} ║\n"
        "╠══════════════════════════════════════════════════╣\n"
        f"║  Saved in: {str(path):<36} ║\n"
        "║  Use these at http://localhost:8000/ui/login     ║\n"
        "╚══════════════════════════════════════════════════╝\n"
    )
    print(banner)
