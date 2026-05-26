"""Shared marketplace listing for API and gateway tools."""

from __future__ import annotations

from typing import Any

from config.ui_store import load_marketplaces_config
from export.registry import EXPORTERS, get_exporter


def list_marketplace_items() -> list[dict[str, Any]]:
    configured = load_marketplaces_config()
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    for key in EXPORTERS:
        exporter = get_exporter(key)  # type: ignore[arg-type]
        entry = configured.get(key, {})
        items.append(
            {
                "id": key,
                "label": entry.get("label") or key,
                "configured": exporter.validate_credentials(),
                "supports_export": True,
            }
        )
        seen.add(key)

    for platform_id, entry in configured.items():
        if platform_id in seen:
            continue
        creds = entry.get("credentials") or {}
        has_creds = any(v for v in creds.values() if v)
        items.append(
            {
                "id": platform_id,
                "label": entry.get("label") or platform_id,
                "configured": bool(entry.get("enabled") and has_creds),
                "supports_export": False,
            }
        )

    return items
