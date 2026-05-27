from core.models import SourcePlatform
from core.plugins import PLUGIN_SPECS, SocialPageScraper, SourcePluginManifest

MANIFEST = SourcePluginManifest(
    id="instagram",
    name="Instagram",
    category="social",
    description="Scrape public Instagram posts and reels via Open Graph metadata.",
    version="0.1.0",
    domains=("instagram.com",),
    tags=("social", "meta", "og"),
    scrape_spec=PLUGIN_SPECS["instagram"],
)


class InstagramScraper(SocialPageScraper):
    platform = SourcePlatform.INSTAGRAM
    site_key = "instagram"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        return (
            self.extract_post_id(url, r"/p/([^/]+)")
            or self.extract_post_id(url, r"/reel/([^/]+)")
            or self.extract_post_id(url, r"/reels/([^/]+)")
        )
