"""Panel security entrance — secret path prefix and pre-login access key."""

from __future__ import annotations

import re
import secrets
from typing import Final
from urllib.parse import urlencode

_ENTRY_RE = re.compile(r"^[a-f0-9]{8}$")
_DISABLED = frozenset({"", "off", "false", "0", "disabled", "-", "none"})

COOKIE_NAME: Final = "crossborder_entrance"


def access_keys_match(provided: str, expected: str) -> bool:
    """Constant-time access key compare; rejects non-ASCII without raising."""
    if not provided or not expected:
        return False
    try:
        a = provided.encode("ascii")
        b = expected.encode("ascii")
    except UnicodeEncodeError:
        return False
    return secrets.compare_digest(a, b)


def normalize_entry_path(value: str | None) -> str | None:
    """Return validated 8-char hex entrance path, or None when disabled."""
    if value is None:
        return None
    stripped = value.strip().lower()
    if stripped in _DISABLED:
        return None
    if _ENTRY_RE.fullmatch(stripped):
        return stripped
    return None


def generate_entry_path() -> str:
    return secrets.token_hex(4)


def generate_access_key(length: int = 32) -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def entrance_prefix(entry_path: str | None) -> str:
    entry = normalize_entry_path(entry_path)
    return f"/{entry}" if entry else ""


def panel_ui_path(entry_path: str | None) -> str:
    prefix = entrance_prefix(entry_path)
    return f"{prefix}/ui/" if prefix else "/ui/"


def panel_login_path(entry_path: str | None) -> str:
    prefix = entrance_prefix(entry_path)
    return f"{prefix}/ui/login" if prefix else "/ui/login"


def health_path(entry_path: str | None) -> str:
    prefix = entrance_prefix(entry_path)
    return f"{prefix}/health" if prefix else "/health"


def format_public_host(host: str, port: int, *, https: bool = False) -> str:
    """Host with port omitted for standard HTTP/HTTPS public URLs (nginx on 80/443)."""
    if (https and port == 443) or (not https and port == 80):
        return host
    return f"{host}:{port}"


def build_entrance_url(host: str, port: int, entry_path: str | None, *, https: bool = False) -> str:
    scheme = "https" if https else "http"
    prefix = entrance_prefix(entry_path)
    path = f"{prefix}/" if prefix else "/ui/"
    host_part = format_public_host(host, port, https=https)
    return f"{scheme}://{host_part}{path}"


def build_entrance_access_url(
    host: str,
    port: int,
    entry_path: str,
    *,
    access_key: str,
    https: bool = False,
) -> str:
    """Bookmark URL: /{entry}/?access_key=… — sets entrance cookie then redirects to login."""
    scheme = "https" if https else "http"
    host_part = format_public_host(host, port, https=https)
    prefix = entrance_prefix(entry_path)
    return f"{scheme}://{host_part}{prefix}/?{urlencode({'access_key': access_key})}"


def build_login_url(
    host: str,
    port: int,
    entry_path: str | None,
    *,
    access_key: str | None = None,
    https: bool = False,
) -> str:
    scheme = "https" if https else "http"
    path = panel_login_path(entry_path)
    host_part = format_public_host(host, port, https=https)
    url = f"{scheme}://{host_part}{path}"
    if access_key:
        return f"{url}?{urlencode({'access_key': access_key})}"
    return url


def ensure_panel_entrance(
    env_path,
    *,
    force: bool = False,
    enable: bool | None = None,
) -> tuple[str | None, str | None, bool]:
    """
    Ensure PANEL_ENTRY_PATH and PANEL_ACCESS_KEY in .env when security entrance is on.

    Returns (entry_path, access_key, was_generated).
    """
    from pathlib import Path

    from config.credentials import upsert_env_file

    path = Path(env_path)
    if enable is False:
        return None, None, False

    from config.settings import Settings

    settings = Settings()
    entry = normalize_entry_path(settings.panel_entry_path)
    key = (settings.panel_access_key or "").strip() or None

    if entry and key and not force:
        return entry, key, False
    if entry and not force:
        return entry, key, False

    if enable is None:
        import os

        vps = os.environ.get("CROSSBORDER_VPS", "").strip().lower() in ("1", "true", "yes")
        server = os.environ.get("CROSSBORDER_SERVER", "").strip().lower() in ("1", "true", "yes")
        profile = os.environ.get("CROSSBORDER_INSTALL_PROFILE", "").strip().lower()
        explicit = os.environ.get("PANEL_SECURITY_ENTRANCE", "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        auto_server = profile in ("server", "wwwroot") or server or vps
        if not auto_server and not explicit and settings.panel_entry_path is None:
            return None, None, False

    new_entry = generate_entry_path()
    new_key = generate_access_key()
    upsert_env_file(
        path,
        {
            "PANEL_ENTRY_PATH": new_entry,
            "PANEL_ACCESS_KEY": new_key,
            "PANEL_SECURITY_ENTRANCE": "true",
        },
    )
    return new_entry, new_key, True


def expected_entrance_cookie(access_key: str) -> str:
    import hashlib

    digest = hashlib.sha256(access_key.encode("utf-8")).hexdigest()
    return digest[:32]
