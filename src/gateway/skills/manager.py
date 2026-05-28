"""Discover, enable, and compose built-in + installed agent skills."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from core.paths import agent_skills_config_path, builtin_skills_dir, installed_skills_dir
from gateway.skills.manifest import SkillManifest, load_skill_file
from gateway.tools import TOOL_DEFINITIONS

_BUILTIN_DEFAULT_ENABLED = (
    "scrape-assistant",
    "catalog-monitor",
    "export-review",
    "batch-ops",
    "agent-control",
)


@lru_cache(maxsize=1)
def _load_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"enabled": list(_BUILTIN_DEFAULT_ENABLED)}
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return raw if isinstance(raw, dict) else {"enabled": list(_BUILTIN_DEFAULT_ENABLED)}


class SkillManager:
    def __init__(self) -> None:
        self.builtin_dir = builtin_skills_dir()
        self.installed_root = installed_skills_dir()
        self.config_path = agent_skills_config_path()

    def reload(self) -> None:
        _load_config.cache_clear()

    def load_config(self) -> dict[str, Any]:
        return _load_config(self.config_path)

    def enabled_ids(self) -> set[str]:
        cfg = self.load_config()
        enabled = cfg.get("enabled") or _BUILTIN_DEFAULT_ENABLED
        if not isinstance(enabled, list):
            return set(_BUILTIN_DEFAULT_ENABLED)
        return {str(x).strip() for x in enabled if str(x).strip()}

    def set_enabled(self, skill_ids: list[str]) -> list[str]:
        known = set(self.all_manifests())
        ids = sorted(
            {str(s).strip() for s in skill_ids if str(s).strip() and str(s).strip() in known}
        )
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        data = self.load_config()
        data["enabled"] = ids
        self.config_path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
        self.reload()
        return ids

    def toggle_skill(self, skill_id: str, *, enabled: bool) -> set[str]:
        current = self.enabled_ids()
        if enabled:
            current.add(skill_id)
        else:
            current.discard(skill_id)
        return set(self.set_enabled(sorted(current)))

    def _discover_builtin(self) -> dict[str, SkillManifest]:
        found: dict[str, SkillManifest] = {}
        if not self.builtin_dir.is_dir():
            return found
        for child in sorted(self.builtin_dir.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            skill_md = child / "SKILL.md"
            if skill_md.is_file():
                found[child.name] = load_skill_file(skill_md, skill_id=child.name, trusted=True)
        return found

    def _discover_installed(self) -> dict[str, SkillManifest]:
        found: dict[str, SkillManifest] = {}
        if not self.installed_root.is_dir():
            return found
        for child in sorted(self.installed_root.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            skill_md = child / "SKILL.md"
            if skill_md.is_file():
                found[child.name] = load_skill_file(skill_md, skill_id=child.name, trusted=False)
        return found

    def all_manifests(self) -> dict[str, SkillManifest]:
        merged = self._discover_builtin()
        merged.update(self._discover_installed())
        return merged

    def list_catalog(self) -> list[dict[str, Any]]:
        from gateway.skills.registry_client import registry_skill_url

        enabled = self.enabled_ids()
        installed_state = self.load_installed_state().get("skills") or {}
        items: list[dict[str, Any]] = []
        for sid, manifest in self.all_manifests().items():
            kind = "builtin" if (self.builtin_dir / sid).is_dir() else "installed"
            meta = installed_state.get(sid) if isinstance(installed_state.get(sid), dict) else {}
            registry = str(meta.get("registry") or "").strip()
            slug = str(meta.get("slug") or sid).strip()
            source = "builtin" if kind == "builtin" else ("registry" if registry else "installed")
            homepage = manifest.homepage or (registry_skill_url(slug) if registry else "")
            row = manifest.to_catalog_dict(
                enabled=sid in enabled,
                installed=True,
                kind=kind,
                source=source,
                registry_slug=slug if registry else "",
                registry_url=registry_skill_url(slug) if registry else "",
                installed_at=str(meta.get("installed_at") or ""),
                registry_version=str(meta.get("version") or manifest.version),
            )
            if homepage:
                row["homepage"] = homepage
            items.append(row)
        return sorted(items, key=lambda r: (r.get("kind") != "builtin", r.get("name") or ""))

    def get_manifest(self, skill_id: str) -> SkillManifest | None:
        return self.all_manifests().get(skill_id)

    def resolve_registry_slug(self, slug: str) -> str | None:
        """Map a registry slug to a locally installed skill id, if present."""
        slug = slug.strip()
        if not slug:
            return None
        if slug in self.all_manifests():
            return slug
        state = self.load_installed_state().get("skills") or {}
        for sid, meta in state.items():
            if isinstance(meta, dict) and str(meta.get("slug") or "").strip() == slug:
                return str(sid).strip() or None
        return None

    def registry_match_ids(self) -> set[str]:
        """Skill ids plus registry slugs — used to mark registry rows as installed."""
        ids = set(self.all_manifests())
        state = self.load_installed_state().get("skills") or {}
        for sid, meta in state.items():
            if isinstance(meta, dict):
                reg_slug = str(meta.get("slug") or "").strip()
                if reg_slug:
                    ids.add(reg_slug)
            sid_text = str(sid).strip()
            if sid_text:
                ids.add(sid_text)
        return ids

    def registry_enabled_ids(self) -> set[str]:
        """Enabled skill ids plus their registry slugs for browse UI."""
        enabled = set(self.enabled_ids())
        state = self.load_installed_state().get("skills") or {}
        for sid in list(enabled):
            meta = state.get(sid)
            if isinstance(meta, dict):
                reg_slug = str(meta.get("slug") or "").strip()
                if reg_slug:
                    enabled.add(reg_slug)
        return enabled

    def enabled_manifests(self, skill_ids: list[str] | None = None) -> list[SkillManifest]:
        ids = skill_ids if skill_ids is not None else sorted(self.enabled_ids())
        all_m = self.all_manifests()
        out: list[SkillManifest] = []
        for sid in ids:
            m = all_m.get(sid)
            if m:
                out.append(m)
        return out

    def compose_instructions(
        self,
        base_prompt: str,
        *,
        skill_ids: list[str] | None = None,
    ) -> tuple[list[str], str, set[str]]:
        """Return (resolved skill ids, combined system prompt, allowed tool names)."""
        manifests = self.enabled_manifests(skill_ids)
        if not manifests:
            return [], base_prompt, set()

        sections = [base_prompt.strip(), "\n## Active skills\n"]
        known_tools = {t["name"] for t in TOOL_DEFINITIONS}
        tool_names: set[str] = set()
        resolved: list[str] = []

        for m in manifests:
            resolved.append(m.id)
            tool_names.update(t for t in m.tools if t in known_tools)
            sections.append(f"\n### {m.emoji} {m.name} (`{m.id}`)\n")
            if m.description:
                sections.append(f"{m.description}\n")
            if m.body:
                sections.append(m.body.strip())
                sections.append("")

        return resolved, "\n".join(sections).strip(), tool_names

    def installed_state_path(self) -> Path:
        return self.installed_root / "installed.json"

    def load_installed_state(self) -> dict[str, Any]:
        path = self.installed_state_path()
        if not path.is_file():
            return {"skills": {}}
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {"skills": {}}
        return raw if isinstance(raw, dict) else {"skills": {}}

    def write_installed_state(self, data: dict[str, Any]) -> None:
        self.installed_root.mkdir(parents=True, exist_ok=True)
        self.installed_state_path().write_text(
            json.dumps(data, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )


_manager: SkillManager | None = None


def get_skill_manager() -> SkillManager:
    global _manager
    if _manager is None:
        _manager = SkillManager()
        _manager.installed_root.mkdir(parents=True, exist_ok=True)
    return _manager
