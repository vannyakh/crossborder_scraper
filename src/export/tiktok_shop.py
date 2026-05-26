import httpx
from loguru import logger

from config import Settings
from core.models import ExportListing
from export.base import BaseExporter


class TikTokShopExporter(BaseExporter):
    """
    TikTok Shop Partner API — https://partner.tiktokshop.com/

    Product create: POST /product/202309/products
    """

    marketplace = "tiktok_shop"
    API_HOST = "https://open-api.tiktokglobalshop.com"

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def validate_credentials(self) -> bool:
        return all(
            [
                self.settings.tiktok_app_key,
                self.settings.tiktok_access_token,
                self.settings.tiktok_shop_cipher,
            ]
        )

    async def publish(self, listing: ExportListing) -> dict:
        if not self.validate_credentials():
            raise ValueError("TikTok Shop API credentials missing. Configure TikTok Shop in Settings → Marketplaces.")

        payload = {
            "title": listing.title,
            "description": listing.description,
            "category_id": listing.category_id or "600001",
            "main_images": [{"uri": url} for url in listing.images[:9]],
            "skus": [
                {
                    "seller_sku": listing.sku,
                    "price": {"amount": str(listing.price), "currency": listing.currency},
                    "inventory": [{"quantity": listing.stock}],
                }
            ],
        }

        headers = {
            "x-tts-access-token": self.settings.tiktok_access_token,  # type: ignore[arg-type]
            "content-type": "application/json",
        }
        params = {"shop_cipher": self.settings.tiktok_shop_cipher}

        path = "/product/202309/products"
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.API_HOST}{path}",
                headers=headers,
                params=params,
                json=payload,
            )
            data = resp.json()
            logger.info("TikTok Shop publish: {}", data)
            return data
