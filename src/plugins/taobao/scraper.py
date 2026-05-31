import re

from core.base_scraper import BaseScraper
from core.models import ScrapedProduct, SourcePlatform
from plugins.taobao.manifest import MANIFEST


class TaobaoScraper(BaseScraper):
    platform = SourcePlatform.TAOBAO
    site_key = "taobao"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        match = re.search(r"[?&]id=(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"/item/(\d+)", url)
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
                    "h1[data-spm]",
                    "h1[class*='ItemHeader']",
                    "h1[class*='title']",
                    ".tb-main-title",
                    "h1",
                ],
            )
            or f"Taobao Product {product_id}"
        )

        price_text = self.first_text(
            soup,
            [
                "[class*='Price']",
                ".tb-rmb-num",
                "[class*='price']",
            ],
        )
        price = self.parse_price(price_text)

        images = self.collect_images(
            soup,
            [
                "#J_UlThumb img",
                "[class*='PicGallery'] img",
                "img[src*='alicdn']",
            ],
            max_count=self.settings.max_images_per_product,
        )

        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id=product_id,
            title=title,
            price=price,
            currency="CNY",
            images=images,
            attributes={"price_raw": price_text},
        )
