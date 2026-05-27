from core.models import SourcePlatform
from core.plugins import PLUGIN_SPECS, SocialPageScraper, SourcePluginManifest

MANIFEST = SourcePluginManifest(
    id="tiktok",
    name="TikTok",
    category="social",
    description="Scrape public TikTok video pages via Open Graph metadata.",
    version="0.1.0",
    domains=("tiktok.com",),
    tags=("social", "video", "og"),
    scrape_spec=PLUGIN_SPECS["tiktok"],
)


class TikTokScraper(SocialPageScraper):
    platform = SourcePlatform.TIKTOK
    site_key = "tiktok"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        return self.extract_post_id(url, r"/video/(\d+)")
