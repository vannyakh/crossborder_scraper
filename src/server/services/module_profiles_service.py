"""Module profile API — list meta, detail guides, enrich catalog rows."""

from __future__ import annotations

from typing import Any

from server.module_profiles.loader import discover_module_profiles, get_module_profile


class ModuleProfilesService:
    def list_meta(self) -> dict[str, Any]:
        profiles = discover_module_profiles()
        categories: dict[str, dict[str, Any]] = {}
        icons: dict[str, str] = {}

        for profile in profiles.values():
            icons[profile.id] = profile.icon
            bucket = categories.setdefault(
                profile.category,
                {
                    "id": profile.category,
                    "label": profile.category_label,
                    "kinds": set(),
                },
            )
            bucket["kinds"].add(profile.kind)
            if profile.category_label:
                bucket["label"] = profile.category_label

        category_rows = []
        for row in categories.values():
            category_rows.append(
                {
                    "id": row["id"],
                    "label": row["label"],
                    "kinds": sorted(row["kinds"]),
                }
            )
        category_rows.sort(key=lambda item: item["label"])

        modules = [profile.to_summary_dict() for profile in profiles.values()]
        modules.sort(key=lambda item: (item.get("kind") or "", item.get("name") or ""))

        return {
            "modules": modules,
            "categories": category_rows,
            "icons": icons,
            "total": len(modules),
        }

    def get_module(self, module_id: str) -> dict[str, Any]:
        profile = get_module_profile(module_id)
        if not profile:
            raise LookupError(f"unknown module profile: {module_id}")
        return profile.to_detail_dict()


_service: ModuleProfilesService | None = None


def get_module_profiles_service() -> ModuleProfilesService:
    global _service
    if _service is None:
        _service = ModuleProfilesService()
    return _service
