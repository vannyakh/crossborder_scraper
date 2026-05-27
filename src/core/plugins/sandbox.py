"""Load and run untrusted plugins inside a constrained workspace."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from loguru import logger

from core.models import SourcePlatform
from core.plugins.security import (
    InstalledPluginManifest,
    PluginSecurityError,
    SecurityPolicy,
    assert_url_allowed,
)

if TYPE_CHECKING:
    from core.base_scraper import BaseScraper
    from core.models import ScrapedProduct


class SandboxedPluginLoader:
    """Import plugin entry class from ``installed_plugins/{id}/`` only."""

    def __init__(self, workspace: Path, manifest: InstalledPluginManifest) -> None:
        self.workspace = workspace.resolve()
        self.manifest = manifest
        self._scraper_cls: type[BaseScraper] | None = None

    def load_scraper_class(self) -> type[BaseScraper]:
        if self._scraper_cls is not None:
            return self._scraper_cls

        from core.base_scraper import BaseScraper

        entry_path = self.workspace / f"{self.manifest.entry_module}.py"
        if not entry_path.is_file():
            raise PluginSecurityError(f"entry module not found: {entry_path.name}")

        module_name = f"installed_plugin_{self.manifest.id}_{self.manifest.entry_module}"
        spec = importlib.util.spec_from_file_location(
            module_name,
            entry_path,
            submodule_search_locations=[str(self.workspace)],
        )
        if spec is None or spec.loader is None:
            raise PluginSecurityError("failed to create module spec")

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        try:
            spec.loader.exec_module(module)
        except Exception as exc:
            raise PluginSecurityError(f"plugin load failed: {exc}") from exc

        cls = getattr(module, self.manifest.entry_class, None)
        if cls is None:
            raise PluginSecurityError(f"class {self.manifest.entry_class} not found in plugin module")

        if not isinstance(cls, type) or not issubclass(cls, BaseScraper):
            raise PluginSecurityError("entry_class must subclass core.base_scraper.BaseScraper")

        self._scraper_cls = cls
        return cls

    def create_scraper(self) -> BaseScraper:
        return self.load_scraper_class()()


class SandboxedScraperAdapter:
    """
    Host-controlled scraper facade for an installed plugin.
    Enforces domain allowlist before delegating to plugin code.

    The scrape engine uses ``scrape_product`` directly (not fetch_page/parse_html).
    """

    sandboxed = True
    platform = SourcePlatform.CUSTOM
    site_key = "installed_plugin"

    def __init__(
        self,
        manifest: InstalledPluginManifest,
        policy: SecurityPolicy,
        loader: SandboxedPluginLoader,
    ) -> None:
        self.manifest = manifest
        self.policy = policy
        self.loader = loader
        self.site_key = manifest.id
        self.base_domains = manifest.domains
        self._runner = SandboxedScrapeRunner(manifest, policy, loader)

    def matches_url(self, url: str) -> bool:
        host = urlparse(url).netloc.lower().replace("www.", "")
        return bool(host) and any(domain in host for domain in self.manifest.domains)

    async def scrape_product(self, url: str) -> ScrapedProduct:
        return await self._runner.scrape_url(url)

    def extract_product_id(self, url: str) -> str | None:
        scraper = self.loader.create_scraper()
        if hasattr(scraper, "extract_product_id"):
            return scraper.extract_product_id(url)
        return None


class SandboxedScrapeRunner:
    """Enforce domain allowlist and scrape timeout for untrusted plugins."""

    def __init__(
        self,
        manifest: InstalledPluginManifest,
        policy: SecurityPolicy,
        loader: SandboxedPluginLoader,
    ) -> None:
        self.manifest = manifest
        self.policy = policy
        self.loader = loader

    async def scrape_url(self, url: str) -> ScrapedProduct:
        assert_url_allowed(url, self.manifest.domains)
        scraper = self.loader.create_scraper()

        if not scraper.matches_url(url):
            raise PluginSecurityError("plugin refused URL (domain mismatch)")

        timeout = self.policy.scrape_timeout_seconds
        try:
            return await asyncio.wait_for(scraper.scrape_product(url), timeout=timeout)
        except TimeoutError as exc:
            raise PluginSecurityError(f"plugin scrape exceeded {timeout}s") from exc
        except PluginSecurityError:
            raise
        except Exception as exc:
            logger.warning("Sandboxed plugin {} failed: {}", self.manifest.id, exc)
            raise PluginSecurityError(f"plugin scrape failed: {exc}") from exc
