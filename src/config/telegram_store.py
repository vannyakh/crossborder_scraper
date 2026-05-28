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
        "bot_display_name",
        "bot_tagline",
        "group_require_mention",
        "agent_wake_names",
        "confirm_before_agent",
        "confirm_before_agent_groups_only",
    }
)


def default_telegram() -> dict[str, Any]:
    return {
        "enabled": False,
        "bot_token": "",
        "control_chat_ids": [],
        "allow_any_chat": False,
        "prompt_id": "telegram_agent",
        "max_reply_chars": 3500,
        "bot_display_name": "Cross-Border Assistant",
        "bot_tagline": "Your gateway agent for cross-border operations",
        "group_require_mention": True,
        "agent_wake_names": ["agent"],
        "confirm_before_agent": True,
        "confirm_before_agent_groups_only": False,
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


def _parse_wake_names(value: Any, base: dict[str, Any]) -> list[str]:
    if not isinstance(value, list):
        return list(base.get("agent_wake_names") or ["agent"])
    names = [str(x).strip() for x in value if str(x).strip()]
    return names or list(base.get("agent_wake_names") or ["agent"])


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
    merged["bot_display_name"] = (
        str(merged.get("bot_display_name") or base["bot_display_name"]).strip()
        or base["bot_display_name"]
    )
    merged["bot_tagline"] = (
        str(merged.get("bot_tagline") or base["bot_tagline"]).strip() or base["bot_tagline"]
    )
    merged["group_require_mention"] = bool(
        merged.get("group_require_mention", base["group_require_mention"])
    )
    merged["agent_wake_names"] = _parse_wake_names(merged.get("agent_wake_names"), base)
    merged["confirm_before_agent"] = bool(
        merged.get("confirm_before_agent", base["confirm_before_agent"])
    )
    merged["confirm_before_agent_groups_only"] = bool(
        merged.get("confirm_before_agent_groups_only", base["confirm_before_agent_groups_only"])
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
