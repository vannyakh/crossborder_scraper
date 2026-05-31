"""Load community project flow templates from libs/project_templates/*.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from core.paths import repo_root
from server.projects.derive import build_preview

TEMPLATES_DIR = repo_root() / "libs" / "project_templates"


@dataclass(frozen=True)
class ProjectTemplate:
    id: str
    name: str
    summary: str
    description: str
    category: str
    category_label: str
    tags: tuple[str, ...]
    author: str
    featured: bool
    nodes: tuple[dict[str, Any], ...]
    edges: tuple[dict[str, Any], ...]
    source_path: str

    @property
    def node_count(self) -> int:
        return len(self.nodes)

    def to_summary_dict(self) -> dict[str, Any]:
        preview = build_preview(list(self.nodes), list(self.edges))
        return {
            "id": self.id,
            "name": self.name,
            "summary": self.summary,
            "category": self.category,
            "category_label": self.category_label,
            "tags": list(self.tags),
            "author": self.author,
            "featured": self.featured,
            "node_count": self.node_count,
            "preview_nodes": preview["preview_nodes"],
            "preview_edges": preview["preview_edges"],
            "source_path": self.source_path,
        }

    def to_detail_dict(self) -> dict[str, Any]:
        return {
            **self.to_summary_dict(),
            "description": self.description,
            "nodes": [dict(node) for node in self.nodes],
            "edges": [dict(edge) for edge in self.edges],
        }


def _parse_template_file(path: Path) -> ProjectTemplate | None:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(raw, dict):
        return None

    template_id = str(raw.get("id") or path.stem).strip()
    if not template_id:
        return None

    nodes_raw = raw.get("nodes") or []
    edges_raw = raw.get("edges") or []
    if not isinstance(nodes_raw, list) or not isinstance(edges_raw, list):
        return None
    if not nodes_raw:
        return None

    tags_raw = raw.get("tags") or []
    if isinstance(tags_raw, list):
        tags = tuple(str(tag) for tag in tags_raw if str(tag).strip())
    else:
        tags = ()

    category = str(raw.get("category") or "general")
    return ProjectTemplate(
        id=template_id,
        name=str(raw.get("name") or template_id),
        summary=str(raw.get("summary") or ""),
        description=str(raw.get("description") or raw.get("summary") or ""),
        category=category,
        category_label=str(raw.get("category_label") or category.replace("_", " ").title()),
        tags=tags,
        author=str(raw.get("author") or "Cross-Border"),
        featured=bool(raw.get("featured")),
        nodes=tuple(dict(node) for node in nodes_raw if isinstance(node, dict) and node.get("id")),
        edges=tuple(
            dict(edge) for edge in edges_raw if isinstance(edge, dict) and edge.get("from")
        ),
        source_path=f"libs/project_templates/{path.name}",
    )


@lru_cache(maxsize=1)
def discover_project_templates() -> dict[str, ProjectTemplate]:
    templates: dict[str, ProjectTemplate] = {}
    if not TEMPLATES_DIR.is_dir():
        return templates
    for path in sorted(TEMPLATES_DIR.glob("*.json")):
        if path.name.startswith("."):
            continue
        template = _parse_template_file(path)
        if template:
            templates[template.id] = template
    return templates


def get_project_template(template_id: str) -> ProjectTemplate | None:
    return discover_project_templates().get(template_id)


def reload_project_templates() -> None:
    discover_project_templates.cache_clear()
