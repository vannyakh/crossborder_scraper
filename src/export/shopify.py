import httpx
from loguru import logger

from config import Settings
from core.models import ExportListing
from export.base import BaseExporter


class ShopifyExporter(BaseExporter):
    """
    Shopify Admin REST API — create product with variants and images.
    https://shopify.dev/docs/api/admin-rest
    """

    marketplace = "shopify"

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    @property
    def _base_url(self) -> str:
        domain = self.settings.shopify_shop_domain
        version = self.settings.shopify_api_version
        return f"https://{domain}/admin/api/{version}"

    def validate_credentials(self) -> bool:
        return bool(self.settings.shopify_shop_domain and self.settings.shopify_access_token)

    async def publish(self, listing: ExportListing) -> dict:
        if not self.validate_credentials():
            raise ValueError(
                "Shopify credentials missing. Configure Shopify in Settings → Marketplaces."
            )

        product_payload = {
            "product": {
                "title": listing.title,
                "body_html": listing.description,
                "vendor": listing.source_platform.value,
                "product_type": "Imported",
                "tags": "imported,crossborder",
                "variants": [
                    {
                        "sku": listing.sku,
                        "price": str(listing.price),
                        "inventory_quantity": listing.stock,
                        "inventory_management": "shopify",
                    }
                ],
                "images": [{"src": url} for url in listing.images[:10]],
            }
        }

        headers = {
            "X-Shopify-Access-Token": self.settings.shopify_access_token,  # type: ignore[arg-type]
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self._base_url}/products.json",
                headers=headers,
                json=product_payload,
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("Shopify product created: id={}", data.get("product", {}).get("id"))
            return data
