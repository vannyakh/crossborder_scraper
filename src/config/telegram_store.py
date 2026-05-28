"""Telegram channel settings (``telegram`` block in ``config/ui_config.json``)."""

from __future__ import annotations

import os
from typing import Any

_TELEGRAM_KEYS = frozenset(
    {
        "enabled",
        "bot_token",
        "control_chat_ids",
        "allow_any_chat",
        "prompt_id",
        "max_reply_chars",
    }
)


def default_telegram() -> dict[str, Any]:
    return {
        "enabled": False,
        "bot_token": "",
        "control_chat_ids": [],
        "allow_any_chat": False,
        "prompt_id": "gateway_agent",
        "max_reply_chars": 3500,
    }


def _parse_id_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    out: list[int] = []
    for item in value:
        try:
            out.append(int(item))
        except (TypeError, ValueError):
            continue
    return out


def normalize_telegram(raw: Any) -> dict[str, Any]:
    base = default_telegram()
    if not isinstance(raw, dict):
        return base
    merged = {**base, **raw}
    merged["enabled"] = bool(merged.get("enabled"))
    merged["allow_any_chat"] = bool(merged.get("allow_any_chat"))
    merged["bot_token"] = str(merged.get("bot_token") or "").strip()
    merged["control_chat_ids"] = _parse_id_list(merged.get("control_chat_ids"))
    merged["prompt_id"] = (
        str(merged.get("prompt_id") or base["prompt_id"]).strip() or base["prompt_id"]
    )
    try:
        merged["max_reply_chars"] = max(500, min(8000, int(merged.get("max_reply_chars") or 3500)))
    except (TypeError, ValueError):
        merged["max_reply_chars"] = base["max_reply_chars"]
    return merged


def merge_telegram_updates(current: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    out = normalize_telegram(current)
    for key, value in updates.items():
        if key not in _TELEGRAM_KEYS:
            continue
        if key == "bot_token" and isinstance(value, str) and "…" in value:
            continue
        if value is None:
            if key == "bot_token":
                out[key] = ""
            elif key == "control_chat_ids":
                out[key] = []
            continue
        if key == "control_chat_ids":
            out[key] = _parse_id_list(value)
            continue
        out[key] = value
    return normalize_telegram(out)


def load_telegram_config() -> dict[str, Any]:
    from config.ui_store import load_panel_raw

    cfg = normalize_telegram(load_panel_raw().get("telegram"))
    env_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if env_token:
        cfg = {**cfg, "bot_token": env_token}
    return cfg
