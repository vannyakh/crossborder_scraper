from core.models import SourcePlatform
from core.plugins.base import SocialPageScraper
from plugins.tiktok.manifest import MANIFEST


class TikTokScraper(SocialPageScraper):
    platform = SourcePlatform.TIKTOK
    site_key = "tiktok"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        return self.extract_post_id(url, r"/video/(\d+)")
