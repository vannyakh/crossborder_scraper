"""Discover, enable, and compose gateway agent rules (RULE.md)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from core.paths import agent_rules_config_path, builtin_agent_rules_dir, custom_agent_rules_dir
from gateway.rules.manifest import RuleManifest, load_rule_file, parse_rule_md

_DEFAULT_ENABLED = (
    "safety",
    "export-policy",
    "tool-discipline",
)


@lru_cache(maxsize=1)
def _load_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"enabled": list(_DEFAULT_ENABLED)}
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return raw if isinstance(raw, dict) else {"enabled": list(_DEFAULT_ENABLED)}


class RuleManager:
    def __init__(self) -> None:
        self.builtin_dir = builtin_agent_rules_dir()
        self.custom_dir = custom_agent_rules_dir()
        self.config_path = agent_rules_config_path()

    def reload(self) -> None:
        _load_config.cache_clear()

    def load_config(self) -> dict[str, Any]:
        return _load_config(self.config_path)

    def enabled_ids(self) -> set[str]:
        cfg = self.load_config()
        enabled = cfg.get("enabled") or _DEFAULT_ENABLED
        if not isinstance(enabled, list):
            return set(_DEFAULT_ENABLED)
        return {str(x).strip() for x in enabled if str(x).strip()}

    def set_enabled(self, rule_ids: list[str]) -> list[str]:
        known = set(self.all_manifests())
        ids = sorted({str(r).strip() for r in rule_ids if str(r).strip() and str(r).strip() in known})
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        data = self.load_config()
        data["enabled"] = ids
        self.config_path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
        self.reload()
        return ids

    def toggle_rule(self, rule_id: str, *, enabled: bool) -> set[str]:
        current = self.enabled_ids()
        if enabled:
            current.add(rule_id)
        else:
            current.discard(rule_id)
        return set(self.set_enabled(sorted(current)))

    def _discover_dir(self, root: Path, *, kind: str) -> dict[str, RuleManifest]:
        found: dict[str, RuleManifest] = {}
        if not root.is_dir():
            return found
        for path in sorted(root.glob("*.md")):
            if path.name.upper() == "README.MD":
                continue
            rid = path.stem.strip()
            if not rid:
                continue
            found[rid] = load_rule_file(path, rule_id=rid, kind=kind)
        return found

    def all_manifests(self) -> dict[str, RuleManifest]:
        merged = self._discover_dir(self.builtin_dir, kind="builtin")
        merged.update(self._discover_dir(self.custom_dir, kind="custom"))
        return merged

    def list_catalog(self) -> list[dict[str, Any]]:
        enabled = self.enabled_ids()
        items = [
            m.to_catalog_dict(enabled=m.id in enabled)
            for m in self.all_manifests().values()
        ]
        return sorted(items, key=lambda r: (r.get("kind") != "builtin", r.get("priority", 50), r.get("name") or ""))

    def get_manifest(self, rule_id: str) -> RuleManifest | None:
        return self.all_manifests().get(rule_id)

    def get_detail(self, rule_id: str) -> dict[str, Any]:
        manifest = self.get_manifest(rule_id)
        if not manifest:
            raise LookupError(f"unknown rule: {rule_id}")
        row = manifest.to_catalog_dict(enabled=rule_id in self.enabled_ids())
        row["body"] = manifest.body
        return row

    def enabled_manifests(self) -> list[RuleManifest]:
        ids = sorted(self.enabled_ids())
        all_m = self.all_manifests()
        out: list[RuleManifest] = []
        for rid in ids:
            m = all_m.get(rid)
            if m:
                out.append(m)
        return sorted(out, key=lambda m: (m.priority, m.name))

    def apply_rules(self, base_prompt: str) -> tuple[list[str], str]:
        """Append enabled rule bodies to the system prompt."""
        manifests = self.enabled_manifests()
        if not manifests:
            return [], base_prompt.strip()

        sections = [base_prompt.strip(), "\n## Agent rules\n"]
        resolved: list[str] = []
        for m in manifests:
            resolved.append(m.id)
            sections.append(f"\n### {m.name} (`{m.id}`)\n")
            if m.description:
                sections.append(f"{m.description}\n")
            if m.body:
                sections.append(m.body.strip())
                sections.append("")

        return resolved, "\n".join(sections).strip()

    def _validate_rule_id(self, rule_id: str) -> str:
        rid = rule_id.strip().lower()
        if not rid or not rid.replace("-", "").replace("_", "").isalnum():
            raise ValueError("rule id must be alphanumeric with hyphens or underscores")
        if rid.upper() == "README":
            raise ValueError("invalid rule id")
        return rid

    def create_custom_rule(
        self,
        *,
        rule_id: str,
        name: str,
        description: str,
        category: str,
        body: str,
        priority: int = 50,
    ) -> dict[str, Any]:
        rid = self._validate_rule_id(rule_id)
        if rid in self.all_manifests():
            raise ValueError(f"rule '{rid}' already exists")

        text = (
            f"---\nname: {name.strip()}\n"
            f"description: {description.strip()}\ncategory: {category.strip()}\n"
            f"priority: {priority}\n---\n\n{body.strip()}\n"
        )
        parse_rule_md(text, rule_id=rid, kind="custom")

        self.custom_dir.mkdir(parents=True, exist_ok=True)
        path = self.custom_dir / f"{rid}.md"
        path.write_text(text, encoding="utf-8")
        self.toggle_rule(rid, enabled=True)
        return self.get_detail(rid)

    def update_custom_rule(
        self,
        rule_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        category: str | None = None,
        body: str | None = None,
        priority: int | None = None,
    ) -> dict[str, Any]:
        manifest = self.get_manifest(rule_id)
        if not manifest:
            raise LookupError(f"unknown rule: {rule_id}")
        if manifest.kind != "custom":
            raise ValueError("built-in rules cannot be edited; create a custom rule instead")

        next_name = name.strip() if name else manifest.name
        next_desc = description.strip() if description is not None else manifest.description
        next_cat = category.strip() if category else manifest.category
        next_priority = priority if priority is not None else manifest.priority
        next_body = body.strip() if body is not None else manifest.body

        text = (
            f"---\nname: {next_name}\n"
            f"description: {next_desc}\ncategory: {next_cat}\n"
            f"priority: {next_priority}\n---\n\n{next_body}\n"
        )
        path = self.custom_dir / f"{rule_id}.md"
        path.write_text(text, encoding="utf-8")
        return self.get_detail(rule_id)

    def delete_custom_rule(self, rule_id: str) -> dict[str, Any]:
        manifest = self.get_manifest(rule_id)
        if not manifest:
            raise LookupError(f"unknown rule: {rule_id}")
        if manifest.kind != "custom":
            raise ValueError("cannot delete built-in rule")

        path = self.custom_dir / f"{rule_id}.md"
        if path.is_file():
            path.unlink()
        self.toggle_rule(rule_id, enabled=False)
        return {"ok": True, "rule_id": rule_id, "removed": True}


_manager: RuleManager | None = None


def get_rule_manager() -> RuleManager:
    global _manager
    if _manager is None:
        _manager = RuleManager()
        _manager.custom_dir.mkdir(parents=True, exist_ok=True)
    return _manager
