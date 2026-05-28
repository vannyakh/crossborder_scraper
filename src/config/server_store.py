"""Server settings (``server`` block in ``config/ui_config.json``)."""

from __future__ import annotations

from typing import Any

from core.timezone import DEFAULT_TIMEZONE, validate_timezone


def default_server() -> dict[str, Any]:
    return {"timezone": DEFAULT_TIMEZONE}


def normalize_server(raw: Any) -> dict[str, Any]:
    base = default_server()
    if not isinstance(raw, dict):
        return base
    merged = {**base, **raw}
    tz = str(merged.get("timezone") or DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE
    try:
        merged["timezone"] = validate_timezone(tz)
    except ValueError:
        merged["timezone"] = DEFAULT_TIMEZONE
    return merged


def load_server_config() -> dict[str, Any]:
    from config.ui_store import load_panel_raw

    return normalize_server(load_panel_raw().get("server"))


def save_server_timezone(timezone: str) -> str:
    validated = validate_timezone(timezone)
    from config.ui_store import _write_panel_raw, load_panel_raw

    raw = load_panel_raw()
    raw["server"] = {**normalize_server(raw.get("server")), "timezone": validated}
    _write_panel_raw(raw)
    return validated


def merge_server_updates(current: Any, updates: dict[str, Any]) -> dict[str, Any]:
    merged = normalize_server(current)
    if "timezone" in updates and updates["timezone"] is not None:
        merged["timezone"] = validate_timezone(str(updates["timezone"]))
    return merged
