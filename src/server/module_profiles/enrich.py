"""Attach module profile metadata to store, skill, and plugin catalog rows."""

from __future__ import annotations

from typing import Any

from server.module_profiles.loader import ModuleProfile, get_module_profile


def enrich_catalog_row(row: dict[str, Any], *, expected_kind: str | None = None) -> dict[str, Any]:
    """Merge profile summary fields onto a catalog row when a guide exists."""
    module_id = str(row.get("id") or "").strip()
    if not module_id:
        return row

    profile = get_module_profile(module_id)
    if not profile:
        return row
    if expected_kind and profile.kind != expected_kind:
        return row

    enriched = {**row}
    enriched["module_kind"] = profile.kind
    enriched["has_guide"] = profile.has_guide
    enriched["guide_summary"] = profile.summary or row.get("description") or ""
    enriched["category_label"] = profile.category_label
    enriched["icon"] = profile.icon
    if profile.summary and not str(row.get("description") or "").strip():
        enriched["description"] = profile.summary
    if profile.tags:
        merged_tags = list(dict.fromkeys([*(row.get("tags") or []), *profile.tags]))
        enriched["tags"] = merged_tags
    return enriched


def profile_for_row(row: dict[str, Any]) -> ModuleProfile | None:
    module_id = str(row.get("id") or "").strip()
    if not module_id:
        return None
    return get_module_profile(module_id)
