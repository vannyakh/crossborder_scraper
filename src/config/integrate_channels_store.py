"""Stored credentials for integrate channels (discord, slack, email) in ui_config.json."""

from __future__ import annotations

from typing import Any

STORED_CHANNEL_IDS = frozenset({"discord", "slack", "email"})

_SECRET_KEYS = frozenset(
    {
        "bot_token",
        "signing_secret",
        "app_token",
        "imap_password",
        "smtp_password",
        "webhook_secret",
    }
)


def _default_common() -> dict[str, Any]:
    return {
        "enabled": False,
        "prompt_id": "gateway_agent",
        "max_reply_chars": 3500,
    }


def default_discord() -> dict[str, Any]:
    return {
        **_default_common(),
        "bot_token": "",
        "application_id": "",
        "public_key": "",
        "guild_id": "",
        "control_channel_ids": [],
        "allow_any_guild": False,
    }


def default_slack() -> dict[str, Any]:
    return {
        **_default_common(),
        "bot_token": "",
        "signing_secret": "",
        "app_token": "",
        "control_channel_ids": [],
        "allow_any_workspace": False,
    }


def default_email() -> dict[str, Any]:
    return {
        **_default_common(),
        "imap_host": "",
        "imap_port": 993,
        "imap_username": "",
        "imap_password": "",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_username": "",
        "smtp_password": "",
        "mailbox_folder": "INBOX",
        "allowed_senders": [],
    }


def default_channel(channel_id: str) -> dict[str, Any]:
    if channel_id == "discord":
        return default_discord()
    if channel_id == "slack":
        return default_slack()
    if channel_id == "email":
        return default_email()
    raise ValueError(f"unknown stored channel: {channel_id}")


def _parse_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        text = str(item).strip()
        if text and text not in out:
            out.append(text)
    return out


def normalize_channel(channel_id: str, raw: Any) -> dict[str, Any]:
    base = default_channel(channel_id)
    if not isinstance(raw, dict):
        return base
    merged = {**base, **raw}
    merged["enabled"] = bool(merged.get("enabled"))
    merged["prompt_id"] = (
        str(merged.get("prompt_id") or base["prompt_id"]).strip() or base["prompt_id"]
    )
    try:
        merged["max_reply_chars"] = max(500, min(8000, int(merged.get("max_reply_chars") or 3500)))
    except (TypeError, ValueError):
        merged["max_reply_chars"] = base["max_reply_chars"]

    if channel_id == "discord":
        merged["allow_any_guild"] = bool(merged.get("allow_any_guild"))
        merged["bot_token"] = str(merged.get("bot_token") or "").strip()
        merged["application_id"] = str(merged.get("application_id") or "").strip()
        merged["public_key"] = str(merged.get("public_key") or "").strip()
        merged["guild_id"] = str(merged.get("guild_id") or "").strip()
        merged["control_channel_ids"] = _parse_str_list(merged.get("control_channel_ids"))
    elif channel_id == "slack":
        merged["allow_any_workspace"] = bool(merged.get("allow_any_workspace"))
        merged["bot_token"] = str(merged.get("bot_token") or "").strip()
        merged["signing_secret"] = str(merged.get("signing_secret") or "").strip()
        merged["app_token"] = str(merged.get("app_token") or "").strip()
        merged["control_channel_ids"] = _parse_str_list(merged.get("control_channel_ids"))
    elif channel_id == "email":
        merged["imap_host"] = str(merged.get("imap_host") or "").strip()
        merged["imap_username"] = str(merged.get("imap_username") or "").strip()
        merged["imap_password"] = str(merged.get("imap_password") or "").strip()
        merged["smtp_host"] = str(merged.get("smtp_host") or "").strip()
        merged["smtp_username"] = str(merged.get("smtp_username") or "").strip()
        merged["smtp_password"] = str(merged.get("smtp_password") or "").strip()
        merged["mailbox_folder"] = str(merged.get("mailbox_folder") or "INBOX").strip() or "INBOX"
        merged["allowed_senders"] = _parse_str_list(merged.get("allowed_senders"))
        try:
            merged["imap_port"] = max(1, min(65535, int(merged.get("imap_port") or 993)))
        except (TypeError, ValueError):
            merged["imap_port"] = 993
        try:
            merged["smtp_port"] = max(1, min(65535, int(merged.get("smtp_port") or 587)))
        except (TypeError, ValueError):
            merged["smtp_port"] = 587

    return merged


def merge_channel_updates(
    channel_id: str,
    current: dict[str, Any],
    updates: dict[str, Any],
) -> dict[str, Any]:
    out = normalize_channel(channel_id, current)
    allowed = set(default_channel(channel_id).keys())
    for key, value in updates.items():
        if key not in allowed:
            continue
        if key in _SECRET_KEYS and isinstance(value, str) and "…" in value:
            continue
        if value is None:
            if key in _SECRET_KEYS:
                out[key] = ""
            elif key.endswith("_ids") or key == "allowed_senders":
                out[key] = []
            continue
        if key in ("control_channel_ids", "allowed_senders"):
            out[key] = _parse_str_list(value)
            continue
        out[key] = value
    return normalize_channel(channel_id, out)


def load_integrate_channels_raw() -> dict[str, Any]:
    from config.ui_store import load_panel_raw

    raw = load_panel_raw().get("integrate_channels")
    if not isinstance(raw, dict):
        return {}
    return raw


def load_stored_channel(channel_id: str) -> dict[str, Any]:
    if channel_id not in STORED_CHANNEL_IDS:
        raise ValueError(f"not a stored channel: {channel_id}")
    raw = load_integrate_channels_raw()
    return normalize_channel(channel_id, raw.get(channel_id))


def channel_is_configured(channel_id: str, cfg: dict[str, Any]) -> bool:
    if channel_id == "discord":
        return bool(cfg.get("bot_token")) and bool(cfg.get("application_id"))
    if channel_id == "slack":
        return bool(cfg.get("bot_token")) and bool(cfg.get("signing_secret"))
    if channel_id == "email":
        return bool(cfg.get("imap_host")) and bool(cfg.get("imap_username"))
    return False
