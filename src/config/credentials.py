"""Panel access credentials — auto-generate and persist to .env on first setup."""

from __future__ import annotations

import secrets
import string
from pathlib import Path

from loguru import logger

_ENV_KEYS = ("PANEL_USERNAME", "PANEL_PASSWORD", "PANEL_AUTH_ENABLED")


def clean_env_file(env_path: Path | None = None) -> list[str]:
    """
    Remove UI-preference keys from .env (they belong in config/ui_config.json).

    Returns env var names that were removed.
    """
    from config.ui_store import ENV_UI_VAR_NAMES

    env_path = env_path or _repo_env_path()
    if not env_path.exists():
        return []

    removed: list[str] = []
    kept: list[str] = []
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or "=" not in raw:
            kept.append(raw)
            continue
        key = raw.split("=", 1)[0].strip()
        if key in ENV_UI_VAR_NAMES:
            removed.append(key)
            continue
        kept.append(raw)

    while kept and not kept[-1].strip():
        kept.pop()

    env_path.write_text("\n".join(kept).rstrip() + "\n", encoding="utf-8")
    return removed


def _repo_env_path() -> Path:
    from core.paths import env_file_path

    return env_file_path()


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

    _migrate_ui_prefs(env_path)

    logger.info("Generated panel credentials → {}", env_path)
    return username, password, True


def _migrate_ui_prefs(env_path: Path) -> None:
    """Move UI preference keys from .env into config/ui_config.json, then strip them."""
    from config.ui_store import load_ui_config

    load_ui_config()
    removed = clean_env_file(env_path)
    if removed:
        logger.info(
            "Moved UI prefs to config/ui_config.json; removed from .env: {}",
            ", ".join(removed),
        )


def print_panel_credentials(
    username: str,
    password: str,
    *,
    env_path: Path | None = None,
    access: object | None = None,
    mode: str = "setup",
    next_commands: list[str] | None = None,
) -> None:
    """Print aaPanel-style access card (prefer passing `access` from deploy.bootstrap)."""
    from deploy.panel_access import default_next_commands, print_panel_access_card

    cmds = next_commands if next_commands is not None else default_next_commands(mode)

    if access is not None:
        print_panel_access_card(access, mode=mode, next_commands=cmds)
        return

    from config import get_settings
    from deploy.network import build_panel_access_info

    settings = get_settings()
    path = env_path or _repo_env_path()
    ext = settings.panel_external_host
    info = build_panel_access_info(
        username=username,
        password=password,
        bind_host=settings.panel_host,
        port=settings.panel_port,
        credentials_generated=False,
        env_path=str(path),
        external_host=ext.strip() if ext else None,
    )
    print_panel_access_card(info, mode=mode, next_commands=cmds)
