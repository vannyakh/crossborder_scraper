from core.base_scraper import BaseScraper
from core.models import ScrapedProduct, SourcePlatform
from plugins._template.manifest import MANIFEST


class TemplateScraper(BaseScraper):
    platform = SourcePlatform.CUSTOM
    site_key = "my_shop"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        return None

    async def scrape_product(self, url: str) -> ScrapedProduct:
        return await self.scrape_with_browser(url)

    async def parse_html(self, url: str, html: str) -> ScrapedProduct:
        soup = self.soup(html)
        title = self.first_text(soup, ["h1", "title"]) or "Sample product"
        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id="sample",
            title=title,
            currency="USD",
        )
