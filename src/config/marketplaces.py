"""Marketplace credential templates and Settings flattening."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# Built-in exporters — custom platforms can be added in ui_config.json
MARKETPLACE_TEMPLATES: dict[str, dict[str, Any]] = {
    "shopee": {
        "label": "Shopee",
        "credentials": {
            "partner_id": "",
            "partner_key": "",
            "shop_id": "",
            "access_token": "",
        },
    },
    "lazada": {
        "label": "Lazada",
        "credentials": {
            "app_key": "",
            "app_secret": "",
            "access_token": "",
        },
    },
    "tiktok_shop": {
        "label": "TikTok Shop",
        "credentials": {
            "app_key": "",
            "app_secret": "",
            "access_token": "",
            "shop_cipher": "",
        },
    },
    "shopify": {
        "label": "Shopify",
        "credentials": {
            "shop_domain": "",
            "access_token": "",
            "api_version": "2025-01",
        },
    },
}

# JSON credential key → Settings attribute
_CREDENTIAL_TO_SETTINGS: dict[str, dict[str, str]] = {
    "shopee": {
        "partner_id": "shopee_partner_id",
        "partner_key": "shopee_partner_key",
        "shop_id": "shopee_shop_id",
        "access_token": "shopee_access_token",
    },
    "lazada": {
        "app_key": "lazada_app_key",
        "app_secret": "lazada_app_secret",
        "access_token": "lazada_access_token",
    },
    "tiktok_shop": {
        "app_key": "tiktok_app_key",
        "app_secret": "tiktok_app_secret",
        "access_token": "tiktok_access_token",
        "shop_cipher": "tiktok_shop_cipher",
    },
    "shopify": {
        "shop_domain": "shopify_shop_domain",
        "access_token": "shopify_access_token",
        "api_version": "shopify_api_version",
    },
}

_SECRET_FIELD_HINTS = ("key", "secret", "token", "password", "cipher")


def default_marketplaces() -> dict[str, Any]:
    out: dict[str, Any] = {}
    for platform_id, template in MARKETPLACE_TEMPLATES.items():
        out[platform_id] = {
            "label": template["label"],
            "enabled": False,
            "credentials": dict(template["credentials"]),
        }
    return out


def normalize_marketplaces(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Merge stored config with built-in templates; preserve custom platforms."""
    base = default_marketplaces()
    if not raw:
        return base
    for platform_id, entry in raw.items():
        if not isinstance(entry, dict):
            continue
        merged = base.get(platform_id, {"label": platform_id, "enabled": False, "credentials": {}})
        merged["label"] = entry.get("label") or merged.get("label") or platform_id
        merged["enabled"] = bool(entry.get("enabled", merged.get("enabled", False)))
        creds = entry.get("credentials")
        if isinstance(creds, dict):
            merged.setdefault("credentials", {})
            merged["credentials"].update({k: v or "" for k, v in creds.items()})
        base[platform_id] = merged
    return base


def flatten_marketplace_credentials(marketplaces: dict[str, Any]) -> dict[str, Any]:
    """Apply marketplace JSON credentials onto flat Settings fields."""
    updates: dict[str, Any] = {}
    for platform_id, entry in normalize_marketplaces(marketplaces).items():
        if not entry.get("enabled"):
            continue
        creds = entry.get("credentials") or {}
        mapping = _CREDENTIAL_TO_SETTINGS.get(platform_id, {})
        for cred_key, value in creds.items():
            if not value:
                continue
            settings_key = mapping.get(cred_key, f"{platform_id}_{cred_key}")
            updates[settings_key] = value
    return updates


def marketplaces_from_settings(settings: Any) -> dict[str, Any]:
    """Seed ui_config marketplaces from flat Settings (one-time migration)."""
    result = default_marketplaces()
    for platform_id, mapping in _CREDENTIAL_TO_SETTINGS.items():
        creds: dict[str, str] = {}
        for cred_key, settings_key in mapping.items():
            val = getattr(settings, settings_key, None)
            if val:
                creds[cred_key] = str(val)
        if creds:
            result[platform_id]["enabled"] = True
            result[platform_id]["credentials"].update(creds)
    return result


def is_secret_field(name: str) -> bool:
    lower = name.lower()
    return any(hint in lower for hint in _SECRET_FIELD_HINTS)


def mask_marketplaces(marketplaces: dict[str, Any], mask_fn: Any) -> dict[str, Any]:
    out = deepcopy(normalize_marketplaces(marketplaces))
    for entry in out.values():
        creds = entry.get("credentials") or {}
        for key, value in list(creds.items()):
            if value and is_secret_field(key):
                creds[key] = mask_fn(str(value))
    return out
