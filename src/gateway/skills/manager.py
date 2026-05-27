"""Discover, enable, and compose built-in + installed agent skills."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from core.paths import agent_skills_config_path, builtin_skills_dir, installed_skills_dir
from gateway.skills.manifest import SkillManifest, load_skill_file

_BUILTIN_DEFAULT_ENABLED = (
    "scrape-assistant",
    "catalog-monitor",
    "export-review",
    "batch-ops",
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
        ids = sorted({str(s).strip() for s in skill_ids if str(s).strip()})
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
        enabled = self.enabled_ids()
        items: list[dict[str, Any]] = []
        for sid, manifest in self.all_manifests().items():
            kind = "builtin" if (self.builtin_dir / sid).is_dir() else "installed"
            items.append(
                manifest.to_catalog_dict(
                    enabled=sid in enabled,
                    installed=True,
                    kind=kind,
                )
            )
        return sorted(items, key=lambda r: (r.get("kind") != "builtin", r.get("name") or ""))

    def get_manifest(self, skill_id: str) -> SkillManifest | None:
        return self.all_manifests().get(skill_id)

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
        tool_names: set[str] = set()
        resolved: list[str] = []

        for m in manifests:
            resolved.append(m.id)
            tool_names.update(m.tools)
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
