from core.models import SourcePlatform
from core.plugins.base import SocialPageScraper
from plugins.instagram.manifest import MANIFEST


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
