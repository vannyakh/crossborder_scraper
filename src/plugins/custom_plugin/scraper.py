from urllib.parse import urlparse

from core.models import SourcePlatform
from core.plugins.base import CustomDomainScraper
from core.plugins.manager import get_plugin_manager


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
