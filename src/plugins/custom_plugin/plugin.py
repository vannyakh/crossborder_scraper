from urllib.parse import urlparse

from core.models import SourcePlatform
from core.plugins import (
    PLUGIN_SPECS,
    CustomDomainScraper,
    SourcePluginManifest,
    get_plugin_manager,
)

MANIFEST = SourcePluginManifest(
    id="custom_plugin",
    name="Custom plugin",
    category="custom",
    description="Template plugin — add domains in config/plugins.yaml (extra_domains).",
    version="0.1.0",
    domains=(),
    tags=("custom", "template", "ecommerce"),
    scrape_spec=PLUGIN_SPECS["custom_plugin"],
)


class CustomPluginScraper(CustomDomainScraper):
    platform = SourcePlatform.CUSTOM
    site_key = "custom_plugin"

    def resolved_domains(self) -> tuple[str, ...]:
        mgr = get_plugin_manager()
        defaults = mgr.source_settings("custom_plugin").get("default_domains") or []
        extra = mgr.extra_domains("custom_plugin")
        if isinstance(defaults, list):
            merged = (*extra, *(str(d).lower() for d in defaults))
        else:
            merged = extra
        return merged or ("example.com",)

    def extract_product_id(self, url: str) -> str | None:
        path = urlparse(url).path.strip("/").replace("/", "-")
        return path or None
