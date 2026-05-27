from core.models import SourcePlatform
from core.plugins import PLUGIN_SPECS, SocialPageScraper, SourcePluginManifest

MANIFEST = SourcePluginManifest(
    id="linkedin",
    name="LinkedIn",
    category="social",
    description="Scrape public LinkedIn posts and company updates via Open Graph metadata.",
    version="0.1.0",
    domains=("linkedin.com",),
    tags=("social", "b2b", "og"),
    scrape_spec=PLUGIN_SPECS["linkedin"],
)


class LinkedInScraper(SocialPageScraper):
    platform = SourcePlatform.LINKEDIN
    site_key = "linkedin"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        return (
            self.extract_post_id(url, r"/posts/([^/?]+)")
            or self.extract_post_id(url, r"/feed/update/urn:li:activity:(\d+)")
            or self.extract_post_id(url, r"activity-(\d+)")
        )
