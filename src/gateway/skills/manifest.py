from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


@dataclass(frozen=True)
class SkillManifest:
    id: str
    name: str
    description: str
    version: str = "1.0.0"
    category: str = "scrape"
    emoji: str = "🤖"
    tools: tuple[str, ...] = ()
    homepage: str = ""
    body: str = ""
    trusted: bool = True
    path: str = ""

    def to_catalog_dict(self, *, enabled: bool, installed: bool, kind: str = "builtin") -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "category": self.category,
            "emoji": self.emoji,
            "tools": list(self.tools),
            "homepage": self.homepage,
            "enabled": enabled,
            "installed": installed,
            "kind": kind,
            "trusted": self.trusted,
            "path": self.path,
        }


def _crossborder_meta(meta: dict[str, Any]) -> dict[str, Any]:
    nested = meta.get("metadata")
    if isinstance(nested, dict):
        raw = nested.get("crossborder") or nested.get("openclaw")
        if isinstance(raw, dict):
            return raw
    raw = meta.get("crossborder") or meta.get("openclaw") or {}
    return raw if isinstance(raw, dict) else {}


def parse_skill_md(text: str, *, skill_id: str, path: str = "", trusted: bool = True) -> SkillManifest:
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

    name = str(meta.get("name") or skill_id).strip()
    description = str(meta.get("description") or "").strip()
    version = str(meta.get("version") or "1.0.0")
    homepage = str(meta.get("homepage") or "")
    cb = _crossborder_meta(meta)
    emoji = str(cb.get("emoji") or "🤖")
    category = str(cb.get("category") or "scrape")
    tools_raw = cb.get("tools") or []
    tools = tuple(str(t) for t in tools_raw) if isinstance(tools_raw, list) else ()

    return SkillManifest(
        id=skill_id,
        name=name,
        description=description,
        version=version,
        category=category,
        emoji=emoji,
        tools=tools,
        homepage=homepage,
        body=body,
        trusted=trusted,
        path=path,
    )


def load_skill_file(path: Path, *, skill_id: str | None = None, trusted: bool = True) -> SkillManifest:
    sid = skill_id or path.parent.name
    text = path.read_text(encoding="utf-8")
    rel = str(path).replace("\\", "/")
    return parse_skill_md(text, skill_id=sid, path=rel, trusted=trusted)
