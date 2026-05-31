"""Base types and scraper mixin for installable source plugins."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from core.base_scraper import BaseScraper
from core.models import ScrapedProduct
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec, ScrapeCategory

PluginKind = Literal["source", "service", "site"]


@dataclass(frozen=True)
class SourcePluginManifest:
    id: str
    name: str
    category: ScrapeCategory
    description: str
    version: str
    domains: tuple[str, ...]
    tags: tuple[str, ...] = ()
    scrape_spec: EcommerceScrapeSpec | None = None

    def to_catalog_dict(
        self,
        *,
        enabled: bool,
        installed: bool,
        kind: PluginKind = "source",
        status: str | None = None,
    ) -> dict[str, Any]:
        st = status or ("running" if installed and enabled else "not_installed")
        row: dict[str, Any] = {
            "id": self.id,
            "kind": kind,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "version": self.version,
            "default_port": 0,
            "supports_docker": False,
            "supports_external": False,
            "docker_image": "",
            "tags": list(self.tags),
            "connection_fields": [],
            "domains": list(self.domains),
            "installed": installed,
            "enabled": enabled,
            "status": st,
            "mode": (
                "source" if installed and kind == "source" else ("site" if kind == "site" else None)
            ),
            "trusted": kind in ("source", "site"),
            "sandboxed": False,
        }
        if self.scrape_spec:
            row["scrape_spec"] = self.scrape_spec.to_dict()
        return row


@dataclass(frozen=True)
class SourcePluginSpec:
    manifest: SourcePluginManifest
    scraper_cls: type[BaseScraper]
    flow_node: FlowNodeSpec | None = None

    @property
    def id(self) -> str:
        return self.manifest.id


class SocialPageScraper(BaseScraper):
    """Extract Open Graph metadata from public social pages."""

    async def scrape_product(self, url: str) -> ScrapedProduct:
        return await self.scrape_with_browser(url)

    async def parse_html(self, url: str, html: str) -> ScrapedProduct:
        soup = self.soup(html)
        product_id = self.extract_product_id(url) or "unknown"
        title = (
            self._meta(soup, "og:title")
            or self.first_text(soup, ["h1", "title"])
            or f"{self.platform.value} content {product_id}"
        )
        description = self._meta(soup, "og:description") or self.first_text(
            soup,
            ["meta[name='description']", "[class*='description']"],
        )
        image = self._meta(soup, "og:image")
        images = [image] if image else self.collect_images(soup, ["img"], max_count=3)

        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id=product_id,
            title=title.strip(),
            description=description,
            images=images,
            attributes={"plugin": self.site_key},
        )

    @staticmethod
    def _meta(soup: BeautifulSoup, prop: str) -> str | None:
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if tag and tag.get("content"):
            return str(tag["content"]).strip()
        return None

    def extract_post_id(self, url: str, pattern: str) -> str | None:
        match = re.search(pattern, url)
        return match.group(1) if match else None


class CustomDomainScraper(SocialPageScraper):
    """Source plugin base that resolves domains from config at runtime."""

    def matches_url(self, url: str) -> bool:
        domains = self.resolved_domains()
        if not domains:
            return False
        host = urlparse(url).netloc.lower().replace("www.", "")
        return any(domain in host for domain in domains)

    def resolved_domains(self) -> tuple[str, ...]:
        return ()
