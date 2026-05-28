"""Discover source plugins, load config, and manage installed plugin workspaces."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

from core.paths import (
    builtin_plugins_dir,
    installed_plugins_dir,
    plugins_config_path,
    repo_root,
)
from core.plugins.base import SourcePluginSpec
from core.plugins.sandbox import SandboxedPluginLoader, SandboxedScraperAdapter
from core.plugins.security import (
    InstalledPluginManifest,
    SecurityPolicy,
    load_manifest_file,
)

if TYPE_CHECKING:
    from core.base_scraper import BaseScraper


@lru_cache(maxsize=1)
def _load_plugins_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"source_plugins": {}, "security": {}}
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return raw if isinstance(raw, dict) else {"source_plugins": {}, "security": {}}


@dataclass
class InstalledPluginSpec:
    manifest: InstalledPluginManifest
    adapter: SandboxedScraperAdapter
    workspace: Path

    @property
    def id(self) -> str:
        return self.manifest.id


class PluginManager:
    """Central registry for ``plugins/`` packages and ``installed_plugins/`` state."""

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or repo_root()
        self.plugins_dir = self.root / "src" / "plugins" if root else builtin_plugins_dir()
        self.installed_root = self.root / "installed_plugins" if root else installed_plugins_dir()
        self.config_path = self.root / "config" / "plugins.yaml" if root else plugins_config_path()
        raw = _load_plugins_config(self.config_path)
        self.security_policy = SecurityPolicy.from_config(raw.get("security"))
        self._builtin_cache: list[SourcePluginSpec] | None = None
        self._installed_specs: list[InstalledPluginSpec] = []

    def reload(self) -> None:
        """Re-scan built-in and installed plugin directories."""
        self._builtin_cache = None
        self._installed_specs = self._discover_installed()

    def ensure_layout(self) -> Path:
        self.installed_root.mkdir(parents=True, exist_ok=True)
        state = self.installed_state_path()
        if not state.exists():
            self._migrate_legacy_state(state)
        if not state.exists():
            state.write_text(json.dumps({"plugins": {}}, indent=2) + "\n", encoding="utf-8")
        if not self._installed_specs:
            self._installed_specs = self._discover_installed()
        return self.installed_root

    def _migrate_legacy_state(self, target: Path) -> None:
        from config import get_settings

        legacy = get_settings().data_dir / "store" / "installed.json"
        if legacy.is_file() and not target.exists():
            target.write_text(legacy.read_text(encoding="utf-8"), encoding="utf-8")
        legacy_plugins = get_settings().data_dir / "store" / "plugins"
        if legacy_plugins.is_dir():
            for child in legacy_plugins.iterdir():
                if child.is_dir():
                    dest = self.installed_root / child.name
                    if not dest.exists():
                        import shutil

                        shutil.copytree(child, dest)

    def installed_state_path(self) -> Path:
        return self.installed_root / "installed.json"

    def load_installed_state(self) -> dict[str, Any]:
        path = self.installed_state_path()
        if not path.is_file():
            return {"plugins": {}}
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {"plugins": {}}
        return raw if isinstance(raw, dict) else {"plugins": {}}

    def write_installed_state(self, data: dict[str, Any]) -> None:
        path = self.installed_state_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    def workspace(self, plugin_id: str) -> Path:
        path = self.installed_root / plugin_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def load_config(self) -> dict[str, Any]:
        return _load_plugins_config(self.config_path)

    def source_settings(self, plugin_id: str) -> dict[str, Any]:
        plugins = self.load_config().get("source_plugins") or {}
        entry = plugins.get(plugin_id)
        return entry if isinstance(entry, dict) else {}

    def is_enabled(self, plugin_id: str) -> bool:
        if plugin_id in self.security_policy.trusted_builtin_ids:
            return bool(self.source_settings(plugin_id).get("enabled", True))
        record = self.load_installed_state().get("plugins", {}).get(plugin_id)
        if isinstance(record, dict):
            return record.get("status") in ("installed", "running")
        return False

    def extra_domains(self, plugin_id: str) -> tuple[str, ...]:
        extra = self.source_settings(plugin_id).get("extra_domains") or []
        if not isinstance(extra, list):
            return ()
        return tuple(str(d).strip().lower() for d in extra if str(d).strip())

    def _discover_installed(self) -> list[InstalledPluginSpec]:
        specs: list[InstalledPluginSpec] = []
        if not self.installed_root.is_dir():
            return specs

        for child in sorted(self.installed_root.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            manifest_path = child / "manifest.json"
            if not manifest_path.is_file():
                continue
            try:
                manifest = load_manifest_file(manifest_path)
                if manifest.trusted:
                    continue
                loader = SandboxedPluginLoader(child, manifest)
                adapter = SandboxedScraperAdapter(manifest, self.security_policy, loader)
                specs.append(
                    InstalledPluginSpec(manifest=manifest, adapter=adapter, workspace=child)
                )
            except Exception:
                continue
        return specs

    def _load_builtin_specs(self) -> list[SourcePluginSpec]:
        if self._builtin_cache is not None:
            return self._builtin_cache

        from plugins.alibaba_1688 import MANIFEST as alibaba_manifest
        from plugins.alibaba_1688 import Alibaba1688Scraper
        from plugins.aliexpress import MANIFEST as aliexpress_manifest
        from plugins.aliexpress import AliExpressScraper
        from plugins.custom_plugin import MANIFEST as custom_manifest
        from plugins.custom_plugin import CustomPluginScraper
        from plugins.instagram import MANIFEST as instagram_manifest
        from plugins.instagram import InstagramScraper
        from plugins.linkedin import MANIFEST as linkedin_manifest
        from plugins.linkedin import LinkedInScraper
        from plugins.taobao import MANIFEST as taobao_manifest
        from plugins.taobao import TaobaoScraper
        from plugins.tiktok import MANIFEST as tiktok_manifest
        from plugins.tiktok import TikTokScraper

        self._builtin_cache = [
            SourcePluginSpec(alibaba_manifest, Alibaba1688Scraper),
            SourcePluginSpec(taobao_manifest, TaobaoScraper),
            SourcePluginSpec(aliexpress_manifest, AliExpressScraper),
            SourcePluginSpec(instagram_manifest, InstagramScraper),
            SourcePluginSpec(tiktok_manifest, TikTokScraper),
            SourcePluginSpec(linkedin_manifest, LinkedInScraper),
            SourcePluginSpec(custom_manifest, CustomPluginScraper),
        ]
        return self._builtin_cache

    def list_specs(self) -> list[SourcePluginSpec]:
        return self._load_builtin_specs()

    def list_installed_specs(self) -> list[InstalledPluginSpec]:
        if not self._installed_specs:
            self._installed_specs = self._discover_installed()
        return list(self._installed_specs)

    def get_spec(self, plugin_id: str) -> SourcePluginSpec | None:
        for spec in self.list_specs():
            if spec.id == plugin_id:
                return spec
        return None

    def get_installed_spec(self, plugin_id: str) -> InstalledPluginSpec | None:
        for spec in self.list_installed_specs():
            if spec.id == plugin_id:
                return spec
        return None

    def get_catalog_item(
        self, plugin_id: str, *, installed_ids: set[str] | None = None
    ) -> dict[str, Any] | None:
        for row in self.list_source_catalog(installed_ids=installed_ids or set()):
            if row.get("id") == plugin_id:
                return row
        return None

    def all_domains(self, spec: SourcePluginSpec) -> tuple[str, ...]:
        return (*spec.manifest.domains, *self.extra_domains(spec.id))

    def list_scrape_specifications(self) -> list[dict[str, Any]]:
        """Full scrape plugin specs for online catalog."""
        installed = set(self.load_installed_state().get("plugins") or {})
        seen: set[str] = set()
        items: list[dict[str, Any]] = []
        for row in self.list_source_catalog(installed_ids=installed):
            pid = str(row.get("id") or "")
            if not pid or pid in seen or not row.get("scrape_spec"):
                continue
            seen.add(pid)
            items.append(row)
        return items

    def list_source_catalog(self, *, installed_ids: set[str] | None = None) -> list[dict[str, Any]]:
        installed = installed_ids or set()
        items: list[dict[str, Any]] = []

        for spec in self.list_specs():
            enabled = self.is_enabled(spec.id)
            is_installed = (
                spec.id in self.security_policy.trusted_builtin_ids or spec.id in installed
            )
            row = spec.manifest.to_catalog_dict(enabled=enabled, installed=is_installed)
            row["domains"] = list(self.all_domains(spec))
            row["trusted"] = True
            row["sandboxed"] = False
            if not enabled and not is_installed:
                row["status"] = "disabled"
            elif enabled and is_installed:
                row["status"] = "running"
            items.append(row)

        state_plugins = self.load_installed_state().get("plugins") or {}
        for spec in self.list_installed_specs():
            is_installed = spec.id in installed or spec.id in state_plugins
            status = "running" if is_installed else "not_installed"
            if isinstance(state_plugins.get(spec.id), dict):
                status = str(state_plugins[spec.id].get("status") or status)
            row = spec.manifest.to_catalog_dict(
                enabled=is_installed,
                installed=is_installed,
                status=status,
            )
            row["domains"] = list(spec.manifest.domains)
            row["trusted"] = False
            row["sandboxed"] = True
            if spec.manifest.scrape_spec:
                row["scrape_spec"] = spec.manifest.scrape_spec.to_dict()
            items.append(row)

        return items

    def enabled_scraper_classes(self) -> list[type[BaseScraper]]:
        return [spec.scraper_cls for spec in self.list_specs() if self.is_enabled(spec.id)]

    def get_scraper_for_url(self, url: str) -> BaseScraper | None:
        for spec in self.list_specs():
            if not self.is_enabled(spec.id):
                continue
            scraper = spec.scraper_cls()
            if scraper.matches_url(url):
                return scraper

        for spec in self.list_installed_specs():
            if not self.is_enabled(spec.id):
                continue
            if spec.adapter.matches_url(url):
                return spec.adapter  # type: ignore[return-value]

        return None

    def get_scraper_by_site(self, site: str) -> BaseScraper:
        site_key = site.strip().lower()
        for spec in self.list_specs():
            if not self.is_enabled(spec.id):
                continue
            if spec.scraper_cls.platform.value == site_key or spec.id == site_key:
                return spec.scraper_cls()
        for spec in self.list_installed_specs():
            if not self.is_enabled(spec.id):
                continue
            adapter = spec.adapter
            if adapter.platform.value == site_key or spec.id == site_key:
                return adapter  # type: ignore[return-value]
        raise ValueError(f"No enabled source plugin for site: {site}")

    def require_scraper_for_url(self, url: str) -> BaseScraper:
        scraper = self.get_scraper_for_url(url)
        if scraper is not None:
            return scraper
        enabled_ids = {spec.id for spec in self.list_specs() if self.is_enabled(spec.id)}
        labels = ", ".join(sorted(enabled_ids))
        raise ValueError(f"URL not supported. Enabled source plugins: {labels}")

    def supported_labels(self) -> list[str]:
        labels = [spec.manifest.name for spec in self.list_specs() if self.is_enabled(spec.id)]
        labels.extend(
            spec.manifest.name for spec in self.list_installed_specs() if self.is_enabled(spec.id)
        )
        return labels

    def security_policy_dict(self) -> dict[str, Any]:
        p = self.security_policy
        return {
            "max_zip_bytes": p.max_zip_bytes,
            "max_files_in_zip": p.max_files_in_zip,
            "max_plugin_py_bytes": p.max_plugin_py_bytes,
            "scrape_timeout_seconds": p.scrape_timeout_seconds,
            "trusted_builtin_ids": sorted(p.trusted_builtin_ids),
            "blocked_import_roots": sorted(
                {
                    "subprocess",
                    "ctypes",
                    "pickle",
                    "eval",
                    "exec",
                    "socket (without network permission)",
                    "playwright (use host BaseScraper)",
                },
            ),
            "install_requirements": [
                "manifest.json with id, domains, entry_module, entry_class, permissions",
                "plugin entry must subclass core.base_scraper.BaseScraper",
                "ZIP only; no requirements.txt; AST scan before enable",
            ],
        }


_manager: PluginManager | None = None


def get_plugin_manager() -> PluginManager:
    global _manager
    if _manager is None:
        _manager = PluginManager()
        _manager.ensure_layout()
    return _manager


def list_source_specs() -> list[SourcePluginSpec]:
    return get_plugin_manager().list_specs()


def get_source_spec(plugin_id: str) -> SourcePluginSpec | None:
    return get_plugin_manager().get_spec(plugin_id)


def get_installed_spec(plugin_id: str) -> InstalledPluginSpec | None:
    return get_plugin_manager().get_installed_spec(plugin_id)


def list_source_catalog(*, installed_ids: set[str] | None = None) -> list[dict[str, Any]]:
    return get_plugin_manager().list_source_catalog(installed_ids=installed_ids)


def enabled_scraper_classes() -> list[type[BaseScraper]]:
    return get_plugin_manager().enabled_scraper_classes()


def get_scraper_for_url(url: str) -> BaseScraper | None:
    return get_plugin_manager().get_scraper_for_url(url)


def require_scraper_for_url(url: str) -> BaseScraper:
    return get_plugin_manager().require_scraper_for_url(url)


def get_scraper_by_site(site: str) -> BaseScraper:
    return get_plugin_manager().get_scraper_by_site(site)


def supported_source_labels() -> list[str]:
    return get_plugin_manager().supported_labels()


def source_plugin_settings(plugin_id: str) -> dict[str, Any]:
    return get_plugin_manager().source_settings(plugin_id)


def is_source_plugin_enabled(plugin_id: str) -> bool:
    return get_plugin_manager().is_enabled(plugin_id)


def source_plugin_domains(plugin_id: str) -> tuple[str, ...]:
    return get_plugin_manager().extra_domains(plugin_id)
