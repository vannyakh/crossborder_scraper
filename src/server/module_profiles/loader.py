"""Load module operator guides from libs/module_profiles/*.md (YAML frontmatter + markdown)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from core.paths import repo_root

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
PROFILES_DIR = repo_root() / "libs" / "module_profiles"


@dataclass(frozen=True)
class ModuleProfile:
    id: str
    kind: str
    name: str
    category: str
    category_label: str
    icon: str
    summary: str
    tags: tuple[str, ...] = ()
    links: tuple[dict[str, str], ...] = ()
    body: str = ""
    source_path: str = ""

    @property
    def has_guide(self) -> bool:
        return bool(self.body.strip())

    def to_summary_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "name": self.name,
            "category": self.category,
            "category_label": self.category_label,
            "icon": self.icon,
            "summary": self.summary,
            "tags": list(self.tags),
            "links": [dict(link) for link in self.links],
            "has_guide": self.has_guide,
            "source_path": self.source_path,
        }

    def to_detail_dict(self) -> dict[str, Any]:
        return {
            **self.to_summary_dict(),
            "body_md": self.body,
        }


def _parse_profile_file(path: Path, *, source_prefix: str) -> ModuleProfile | None:
    text = path.read_text(encoding="utf-8")
    body = text.strip()
    meta: dict[str, Any] = {}
    match = _FRONTMATTER_RE.match(text)
    if match:
        try:
            loaded = yaml.safe_load(match.group(1))
            if isinstance(loaded, dict):
                meta = loaded
        except yaml.YAMLError:
            meta = {}
        body = text[match.end() :].strip()

    module_id = str(meta.get("id") or path.stem).strip()
    if not module_id:
        return None

    links_raw = meta.get("links") or []
    links: list[dict[str, str]] = []
    if isinstance(links_raw, list):
        for item in links_raw:
            if isinstance(item, dict) and item.get("label") and item.get("path"):
                links.append({"label": str(item["label"]), "path": str(item["path"])})

    tags_raw = meta.get("tags") or []
    tags = tuple(str(t) for t in tags_raw if str(t).strip()) if isinstance(tags_raw, list) else ()

    category = str(meta.get("category") or "general")
    return ModuleProfile(
        id=module_id,
        kind=str(meta.get("kind") or "store_service"),
        name=str(meta.get("name") or module_id),
        category=category,
        category_label=str(meta.get("category_label") or category.replace("_", " ").title()),
        icon=str(meta.get("icon") or "server"),
        summary=str(meta.get("summary") or ""),
        tags=tags,
        links=tuple(links),
        body=body,
        source_path=f"{source_prefix}/{path.name}",
    )


def _plugin_readme_paths() -> list[Path]:
    import importlib

    from core.plugins.discovery import root_plugin_dirs

    paths: list[Path] = []
    for package_dir in root_plugin_dirs():
        readme = package_dir / "README.md"
        if not readme.is_file():
            continue
        module_name = f"plugins.{package_dir.name}"
        try:
            module = importlib.import_module(module_name)
            manifest = getattr(module, "MANIFEST", None)
        except Exception:
            continue
        if manifest is None:
            continue
        paths.append(readme)
    return paths


@lru_cache(maxsize=1)
def discover_module_profiles() -> dict[str, ModuleProfile]:
    profiles: dict[str, ModuleProfile] = {}

    if PROFILES_DIR.is_dir():
        for path in sorted(PROFILES_DIR.glob("*.md")):
            if path.name.startswith("."):
                continue
            profile = _parse_profile_file(path, source_prefix="libs/module_profiles")
            if profile:
                profiles[profile.id] = profile

    for path in _plugin_readme_paths():
        profile = _parse_profile_file(
            path,
            source_prefix=f"src/plugins/{path.parent.name}",
        )
        if profile and profile.id not in profiles:
            profiles[profile.id] = profile

    return profiles


def get_module_profile(module_id: str) -> ModuleProfile | None:
    return discover_module_profiles().get(module_id)


def reload_module_profiles() -> None:
    discover_module_profiles.cache_clear()
