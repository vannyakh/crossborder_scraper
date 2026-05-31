"""Discover built-in source plugins under ``src/plugins/<package>/``."""

from __future__ import annotations

import importlib
import pkgutil
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

from core.paths import builtin_plugins_dir
from core.plugins.base import SourcePluginManifest, SourcePluginSpec
from core.plugins.flow_node import resolve_flow_node

if TYPE_CHECKING:
    from core.base_scraper import BaseScraper


def _is_plugin_package(path: Path) -> bool:
    if not path.is_dir() or path.name.startswith(("_", ".")):
        return False
    return (path / "__init__.py").is_file()


def _resolve_scraper(module) -> type[BaseScraper] | None:
    from core.base_scraper import BaseScraper

    explicit = getattr(module, "SCRAPER", None)
    if explicit is not None and isinstance(explicit, type) and issubclass(explicit, BaseScraper):
        return explicit

    for attr in dir(module):
        if attr.startswith("_"):
            continue
        value = getattr(module, attr)
        if isinstance(value, type) and issubclass(value, BaseScraper) and value is not BaseScraper:
            return value
    return None


def _load_package(module_name: str) -> SourcePluginSpec | None:
    try:
        module = importlib.import_module(module_name)
    except Exception:
        return None

    manifest = getattr(module, "MANIFEST", None)
    if not isinstance(manifest, SourcePluginManifest):
        return None

    scraper_cls = _resolve_scraper(module)
    if scraper_cls is None:
        return None

    scrape_spec = getattr(module, "SCRAPE_SPEC", None) or manifest.scrape_spec
    if scrape_spec is not None and manifest.scrape_spec is None:
        manifest = SourcePluginManifest(
            id=manifest.id,
            name=manifest.name,
            category=manifest.category,
            description=manifest.description,
            version=manifest.version,
            domains=manifest.domains,
            tags=manifest.tags,
            scrape_spec=scrape_spec,
        )

    flow_node = resolve_flow_node(module, plugin_id=manifest.id, scrape_spec=scrape_spec)
    return SourcePluginSpec(manifest=manifest, scraper_cls=scraper_cls, flow_node=flow_node)


@lru_cache(maxsize=1)
def discover_builtin_packages() -> tuple[SourcePluginSpec, ...]:
    root = builtin_plugins_dir()
    if not root.is_dir():
        return ()

    specs: list[SourcePluginSpec] = []
    seen: set[str] = set()

    for finder, name, is_pkg in pkgutil.iter_modules([str(root)]):
        if not is_pkg or name.startswith("_"):
            continue
        spec = _load_package(f"plugins.{name}")
        if spec is None or spec.id in seen:
            continue
        seen.add(spec.id)
        specs.append(spec)

    specs.sort(key=lambda row: (row.manifest.category, row.manifest.name.lower()))
    return tuple(specs)


def root_plugin_dirs() -> list[Path]:
    root = builtin_plugins_dir()
    if not root.is_dir():
        return []
    return [path for path in sorted(root.iterdir()) if _is_plugin_package(path)]


def plugin_package_dir(plugin_id: str) -> Path | None:
    import importlib

    for path in root_plugin_dirs():
        module_name = f"plugins.{path.name}"
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        manifest = getattr(module, "MANIFEST", None)
        if manifest is not None and getattr(manifest, "id", None) == plugin_id:
            return path
    return None


def reload_builtin_discovery() -> None:
    discover_builtin_packages.cache_clear()
