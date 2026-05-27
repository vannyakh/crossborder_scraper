"""Load, save, and mask integrate channel configuration."""

from __future__ import annotations

from typing import Any

from config.integrate_channels_store import (
    STORED_CHANNEL_IDS,
    channel_is_configured,
    normalize_channel,
)
from config.telegram_store import load_telegram_config, merge_telegram_updates, normalize_telegram
from gateway.channels.catalog import ALL_CHANNEL_IDS, CHANNEL_CATALOG, get_catalog_entry
from gateway.channels.guides import load_setup_guide, setup_guide_path

_SECRET_SUFFIX = "_masked"
_SET_SUFFIX = "_set"


def _mask_secret_fields(cfg: dict[str, Any], secret_keys: set[str]) -> dict[str, Any]:
    from config.ui_store import mask_api_key

    out = dict(cfg)
    for key in secret_keys:
        value = out.pop(key, None)
        if value:
            out[f"{key}{_SET_SUFFIX}"] = True
            out[f"{key}{_MASK_SUFFIX}"] = mask_api_key(str(value))
        else:
            out[f"{key}{_SET_SUFFIX}"] = False
    return out


def _telegram_secret_keys() -> set[str]:
    return {"bot_token"}


def _stored_secret_keys(channel_id: str) -> set[str]:
    if channel_id == "discord":
        return {"bot_token", "public_key"}
    if channel_id == "slack":
        return {"bot_token", "signing_secret", "app_token"}
    if channel_id == "email":
        return {"imap_password", "smtp_password"}
    return set()


def load_channel_raw(channel_id: str) -> dict[str, Any]:
    if channel_id == "telegram":
        return load_telegram_config()
    if channel_id in STORED_CHANNEL_IDS:
        from config.integrate_channels_store import load_stored_channel

        return load_stored_channel(channel_id)
    raise ValueError(f"unknown channel: {channel_id}")


def load_channel_for_api(channel_id: str, *, mask_secrets: bool = True) -> dict[str, Any]:
    cfg = load_channel_raw(channel_id)
    if channel_id == "telegram":
        cfg = normalize_telegram(cfg)
        if mask_secrets:
            masked = _mask_secret_fields(cfg, _telegram_secret_keys())
            return masked
        cfg["bot_token_set"] = bool(cfg.get("bot_token"))
        return cfg
    cfg = normalize_channel(channel_id, cfg)
    if mask_secrets:
        return _mask_secret_fields(cfg, _stored_secret_keys(channel_id))
    for key in _stored_secret_keys(channel_id):
        cfg[f"{key}{_SET_SUFFIX}"] = bool(cfg.get(key))
    return cfg


def save_channel_updates(channel_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    from config.ui_store import save_panel_config

    if channel_id == "telegram":
        save_panel_config(telegram_updates=updates)
        return load_channel_for_api("telegram")

    if channel_id not in STORED_CHANNEL_IDS:
        raise ValueError(f"unknown channel: {channel_id}")

    save_panel_config(integrate_channel_updates=(channel_id, updates))
    return load_channel_for_api(channel_id)


def channel_runtime_active(channel_id: str) -> bool:
    if channel_id == "telegram":
        from gateway.telegram import lifecycle as tg_lifecycle

        task = tg_lifecycle._task
        return task is not None and not task.done()
    return False


def channel_summary(channel_id: str) -> dict[str, Any]:
    meta = get_catalog_entry(channel_id) or {}
    cfg = load_channel_raw(channel_id)
    if channel_id == "telegram":
        cfg = normalize_telegram(cfg)
        configured = bool(cfg.get("bot_token"))
        enabled = bool(cfg.get("enabled"))
    else:
        cfg = normalize_channel(channel_id, cfg)
        configured = channel_is_configured(channel_id, cfg)
        enabled = bool(cfg.get("enabled"))
    return {
        "id": channel_id,
        "label": meta.get("label") or channel_id,
        "description": meta.get("description") or "",
        "runner": meta.get("runner") or "stored",
        "configured": configured,
        "enabled": enabled,
        "runtime_active": channel_runtime_active(channel_id),
    }


def list_channel_summaries() -> list[dict[str, Any]]:
    return [channel_summary(cid) for cid in ALL_CHANNEL_IDS]


def channel_detail(channel_id: str) -> dict[str, Any]:
    if channel_id not in CHANNEL_CATALOG:
        raise LookupError(f"unknown channel: {channel_id}")
    meta = CHANNEL_CATALOG[channel_id]
    return {
        **channel_summary(channel_id),
        "setup_steps": list(meta.get("setup_steps") or []),
        "setup_guide_md": load_setup_guide(channel_id),
        "setup_guide_path": setup_guide_path(channel_id),
        "fields": list(meta.get("fields") or []),
        "config": load_channel_for_api(channel_id),
    }
