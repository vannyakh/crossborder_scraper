"""Panel setup guides — list and detail from libs/guides/*.md."""

from __future__ import annotations

from typing import Any

from server.guides.catalog import CATEGORY_LABELS, GUIDE_CATALOG
from server.guides.loader import guide_source_path, load_guide_markdown


class GuidesService:
    def list_guides(self, *, category: str | None = None) -> dict[str, Any]:
        items: list[dict[str, Any]] = []
        for guide_id, meta in GUIDE_CATALOG.items():
            if category and meta.get("category") != category:
                continue
            items.append(self._summary(guide_id, meta))
        return {"items": items, "categories": self.list_categories()}

    def list_categories(self) -> list[dict[str, str]]:
        seen: set[str] = set()
        out: list[dict[str, str]] = []
        for meta in GUIDE_CATALOG.values():
            cat = str(meta.get("category") or "panel")
            if cat in seen:
                continue
            seen.add(cat)
            out.append({"id": cat, "label": CATEGORY_LABELS.get(cat, cat.title())})
        return sorted(out, key=lambda row: row["label"])

    def get_guide(self, guide_id: str) -> dict[str, Any]:
        meta = GUIDE_CATALOG.get(guide_id)
        if not meta:
            raise LookupError(f"unknown guide: {guide_id}")
        return {
            **self._summary(guide_id, meta),
            "body_md": load_guide_markdown(guide_id),
            "source_path": guide_source_path(guide_id),
        }

    def guide_id_for_tool(self, tool_id: str) -> str | None:
        for guide_id, meta in GUIDE_CATALOG.items():
            if tool_id in (meta.get("tool_ids") or []):
                return guide_id
        return None

    def _summary(self, guide_id: str, meta: dict[str, Any]) -> dict[str, Any]:
        category = str(meta.get("category") or "panel")
        return {
            "id": guide_id,
            "title": meta.get("title") or guide_id,
            "summary": meta.get("summary") or "",
            "category": category,
            "category_label": CATEGORY_LABELS.get(category, category.title()),
            "tool_ids": list(meta.get("tool_ids") or []),
            "links": list(meta.get("links") or []),
        }


_guides: GuidesService | None = None


def get_guides_service() -> GuidesService:
    global _guides
    if _guides is None:
        _guides = GuidesService()
    return _guides
