from core.models import SourcePlatform
from core.plugins.base import SocialPageScraper
from plugins.linkedin.manifest import MANIFEST


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
