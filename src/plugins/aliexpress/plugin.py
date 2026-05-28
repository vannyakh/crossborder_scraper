import json
import re

from core.base_scraper import BaseScraper
from core.models import ScrapedProduct, SourcePlatform
from core.plugins.base import SourcePluginManifest
from core.plugins.builtin_specs import PLUGIN_SPECS

MANIFEST = SourcePluginManifest(
    id="aliexpress",
    name="AliExpress",
    category="ecommerce",
    description="AliExpress product scraper (embedded JSON + browser fallback).",
    version="1.0.0",
    domains=("aliexpress.com", "aliexpress.us"),
    tags=("ecommerce", "builtin", "playwright"),
    scrape_spec=PLUGIN_SPECS["aliexpress"],
)


class AliExpressScraper(BaseScraper):
    platform = SourcePlatform.ALIEXPRESS
    site_key = "aliexpress"
    base_domains = MANIFEST.domains

    def extract_product_id(self, url: str) -> str | None:
        match = re.search(r"/item/(\d+)\.html", url)
        if match:
            return match.group(1)
        match = re.search(r"productId[=:](\d+)", url)
        return match.group(1) if match else None

    async def scrape_product(self, url: str) -> ScrapedProduct:
        return await self.scrape_with_browser(url)

    async def parse_html(self, url: str, html: str) -> ScrapedProduct:
        product_id = self.extract_product_id(url) or "unknown"

        embedded = self._extract_embedded_json(html)
        if embedded:
            return self._from_embedded(url, product_id, embedded)

        soup = self.soup(html)
        title = (
            self.first_text(
                soup,
                ["h1[data-pl='product-title']", "h1", "[class*='title--']"],
            )
            or f"AliExpress Product {product_id}"
        )

        price_text = self.first_text(
            soup, ["[class*='price--']", "[class*='uniform-banner-box-price']"]
        )
        images = self.collect_images(
            soup,
            ["[class*='slider--'] img", "img[src*='alicdn']"],
            max_count=self.settings.max_images_per_product,
        )

        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id=product_id,
            title=title,
            price=self.parse_price(price_text),
            currency="USD",
            images=images,
        )

    def _extract_embedded_json(self, html: str) -> dict | None:
        match = re.search(r"window\.runParams\s*=\s*(\{.+?\});", html, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        return None

    def _from_embedded(self, url: str, product_id: str, data: dict) -> ScrapedProduct:
        title = data.get("subject") or data.get("title") or f"AliExpress {product_id}"
        price_val = data.get("minAmount", {}).get("value") or data.get("price")
        price = self.parse_price(str(price_val)) if price_val else None
        images = data.get("imagePathList") or data.get("images") or []
        return ScrapedProduct(
            source=self.platform,
            source_url=url,
            source_product_id=product_id,
            title=str(title),
            price=price,
            currency="USD",
            images=[str(i) for i in images[: self.settings.max_images_per_product]],
        )
