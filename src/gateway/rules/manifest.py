"""Parse RULE.md packages for gateway agent behavior control."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

RULE_CATEGORIES = frozenset({"safety", "behavior", "tools", "output", "general"})


@dataclass(frozen=True)
class RuleManifest:
    id: str
    name: str
    description: str
    category: str = "general"
    priority: int = 50
    body: str = ""
    kind: str = "builtin"
    path: str = ""

    def to_catalog_dict(self, *, enabled: bool) -> dict[str, Any]:
        preview = self.body.strip().replace("\n", " ")
        if len(preview) > 160:
            preview = preview[:157] + "…"
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "priority": self.priority,
            "enabled": enabled,
            "kind": self.kind,
            "path": self.path,
            "body_preview": preview,
        }


def parse_rule_md(
    text: str, *, rule_id: str, kind: str = "builtin", path: str = ""
) -> RuleManifest:
    body = text.strip()
    meta: dict[str, Any] = {}
    match = _FRONTMATTER_RE.match(text)
    if match:
        try:
            loaded = yaml.safe_load(match.group(1))
            meta = loaded if isinstance(loaded, dict) else {}
        except yaml.YAMLError:
            meta = {}
        body = text[match.end() :].strip()

    name = str(meta.get("name") or rule_id).strip()
    description = str(meta.get("description") or "").strip()
    category = str(meta.get("category") or "general").strip().lower()
    if category not in RULE_CATEGORIES:
        category = "general"
    try:
        priority = int(meta.get("priority") or 50)
    except (TypeError, ValueError):
        priority = 50
    priority = max(0, min(999, priority))

    return RuleManifest(
        id=rule_id,
        name=name,
        description=description,
        category=category,
        priority=priority,
        body=body,
        kind=kind,
        path=path,
    )


def load_rule_file(
    path: Path, *, rule_id: str | None = None, kind: str = "builtin"
) -> RuleManifest:
    rid = rule_id or path.stem
    text = path.read_text(encoding="utf-8")
    rel = str(path).replace("\\", "/")
    return parse_rule_md(text, rule_id=rid, kind=kind, path=rel)
