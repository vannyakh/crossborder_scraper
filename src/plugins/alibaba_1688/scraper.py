import re

from core.base_scraper import BaseScraper
from core.models import ScrapedProduct, SourcePlatform
from plugins.alibaba_1688.manifest import MANIFEST


class Alibaba1688Scraper(BaseScraper):
    """Scraper for https://www.1688.com/ — run ``crossborder login 1688`` for cookies."""

    platform = SourcePlatform.ALIBABA_1688
    site_key = "1688"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        match = re.search(r"/offer/(\d+)", url)
        return match.group(1) if match else None

    async def scrape_product(self, url: str) -> ScrapedProduct:
        return await self.scrape_with_browser(url)

    async def parse_html(self, url: str, html: str) -> ScrapedProduct:
        soup = self.soup(html)
        product_id = self.extract_product_id(url) or "unknown"

        title = (
            self.first_text(
                soup,
                [
                    "h1.d-title",
                    "h1[class*='title']",
                    ".mod-detail-title h1",
                    "h1",
                ],
            )
            or f"1688 Product {product_id}"
        )

        price_text = self.first_text(
            soup,
            [
                ".price-original",
                "[class*='price']",
                ".mod-detail-price",
            ],
        )
        price = self.parse_price(price_text)

        images = self.collect_images(
            soup,
            [
                ".detail-gallery img",
                ".tab-content-container img",
                "[class*='gallery'] img",
                "img[src*='alicdn']",
            ],
            max_count=self.settings.max_images_per_product,
        )

        description = self.first_text(
            soup,
            [".mod-detail-desc", "#desc-lazyload-container", "[class*='description']"],
        )

        seller = self.first_text(soup, [".company-name", "[class*='seller']", ".shop-company-name"])

        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id=product_id,
            title=title,
            description=description,
            price=price,
            currency="CNY",
            images=images,
            seller_name=seller,
            attributes={"price_raw": price_text},
        )
