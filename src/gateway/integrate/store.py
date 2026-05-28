"""Load, save, and mask integrate channel configuration."""

from __future__ import annotations

from typing import Any

from config.integrate_channels_store import (
    STORED_CHANNEL_IDS,
    channel_is_configured,
    normalize_channel,
)
from config.telegram_store import load_telegram_config, normalize_telegram
from gateway.integrate.catalog import ALL_CHANNEL_IDS, CHANNEL_CATALOG
from gateway.integrate.guides import load_setup_guide, setup_guide_path
from gateway.integrate.registry import get_channel_spec, secret_keys_for

_SECRET_SUFFIX = "_masked"
_SET_SUFFIX = "_set"


def _mask_secret_fields(cfg: dict[str, Any], secret_keys: set[str]) -> dict[str, Any]:
    from config.ui_store import mask_api_key

    out = dict(cfg)
    for key in secret_keys:
        value = out.pop(key, None)
        if value:
            out[f"{key}{_SET_SUFFIX}"] = True
            out[f"{key}{_SECRET_SUFFIX}"] = mask_api_key(str(value))
        else:
            out[f"{key}{_SET_SUFFIX}"] = False
    return out


def load_channel_raw(channel_id: str) -> dict[str, Any]:
    spec = get_channel_spec(channel_id)
    if spec.config_backend == "telegram":
        return load_telegram_config()
    if channel_id in STORED_CHANNEL_IDS:
        from config.integrate_channels_store import load_stored_channel

        return load_stored_channel(channel_id)
    raise ValueError(f"unknown channel: {channel_id}")


def load_channel_for_api(channel_id: str, *, mask_secrets: bool = True) -> dict[str, Any]:
    spec = get_channel_spec(channel_id)
    cfg = load_channel_raw(channel_id)
    secrets = set(spec.secret_keys)

    if spec.config_backend == "telegram":
        cfg = normalize_telegram(cfg)
        if mask_secrets:
            return _mask_secret_fields(cfg, secrets)
        cfg["bot_token_set"] = bool(cfg.get("bot_token"))
        return cfg

    cfg = normalize_channel(channel_id, cfg)
    if mask_secrets:
        return _mask_secret_fields(cfg, secrets)
    for key in secrets:
        cfg[f"{key}{_SET_SUFFIX}"] = bool(cfg.get(key))
    return cfg


def save_channel_updates(channel_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    from config.ui_store import save_panel_config

    spec = get_channel_spec(channel_id)
    if spec.config_backend == "telegram":
        save_panel_config(telegram_updates=updates)
        return load_channel_for_api(channel_id)

    if channel_id not in STORED_CHANNEL_IDS:
        raise ValueError(f"unknown channel: {channel_id}")

    save_panel_config(integrate_channel_updates=(channel_id, updates))
    return load_channel_for_api(channel_id)


def channel_runtime_active(channel_id: str) -> bool:
    spec = get_channel_spec(channel_id)
    if spec.lifecycle_module is None:
        return False
    import importlib

    lifecycle = importlib.import_module(spec.lifecycle_module)
    is_active = getattr(lifecycle, "is_active", None)
    if callable(is_active):
        return bool(is_active())
    task = getattr(lifecycle, "_task", None)
    return task is not None and not task.done()


def channel_summary(channel_id: str) -> dict[str, Any]:
    spec = get_channel_spec(channel_id)
    cfg = load_channel_raw(channel_id)
    if spec.config_backend == "telegram":
        cfg = normalize_telegram(cfg)
        configured = bool(cfg.get("bot_token"))
        enabled = bool(cfg.get("enabled"))
    else:
        cfg = normalize_channel(channel_id, cfg)
        configured = channel_is_configured(channel_id, cfg)
        enabled = bool(cfg.get("enabled"))
    return {
        "id": channel_id,
        "label": spec.label,
        "description": spec.description,
        "runner": spec.runner,
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


__all__ = [
    "channel_detail",
    "channel_runtime_active",
    "channel_summary",
    "list_channel_summaries",
    "load_channel_for_api",
    "load_channel_raw",
    "save_channel_updates",
    "secret_keys_for",
]
