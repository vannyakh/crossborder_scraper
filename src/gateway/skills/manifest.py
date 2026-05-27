"""Parse SKILL.md packages for the Crossborder gateway agent (built-in + installed)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# YAML frontmatter key under `metadata:` — tools, emoji, category for agent integration.
AGENT_SKILL_META_KEY = "crossborder"


@dataclass(frozen=True)
class SkillManifest:
    """Resolved skill package used by SkillManager → GatewayAgent.compose_instructions."""

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

    def to_catalog_dict(
        self, *, enabled: bool, installed: bool, kind: str = "builtin"
    ) -> dict[str, Any]:
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


def _agent_skill_meta(meta: dict[str, Any]) -> dict[str, Any]:
    """Read gateway-agent fields from SKILL.md frontmatter (`metadata.crossborder`)."""
    nested = meta.get("metadata")
    if isinstance(nested, dict):
        raw = nested.get(AGENT_SKILL_META_KEY)
        if isinstance(raw, dict):
            return raw
    raw = meta.get(AGENT_SKILL_META_KEY)
    return raw if isinstance(raw, dict) else {}


def parse_skill_md(
    text: str, *, skill_id: str, path: str = "", trusted: bool = True
) -> SkillManifest:
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
    agent_meta = _agent_skill_meta(meta)
    emoji = str(agent_meta.get("emoji") or "🤖")
    category = str(agent_meta.get("category") or "scrape")
    tools_raw = agent_meta.get("tools") or []
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


def load_skill_file(
    path: Path, *, skill_id: str | None = None, trusted: bool = True
) -> SkillManifest:
    sid = skill_id or path.parent.name
    text = path.read_text(encoding="utf-8")
    rel = str(path).replace("\\", "/")
    return parse_skill_md(text, skill_id=sid, path=rel, trusted=trusted)
