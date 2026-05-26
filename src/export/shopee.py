import hashlib
import hmac
import time

import httpx
from loguru import logger

from config import Settings
from core.models import ExportListing
from export.base import BaseExporter


class ShopeeExporter(BaseExporter):
    """
    Shopee Open Platform — https://open.shopee.com/

    Requires partner_id, partner_key, shop_id, access_token in .env
    """

    marketplace = "shopee"
    API_HOST = "https://partner.shopeemobile.com"

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def validate_credentials(self) -> bool:
        return all(
            [
                self.settings.shopee_partner_id,
                self.settings.shopee_partner_key,
                self.settings.shopee_shop_id,
                self.settings.shopee_access_token,
            ]
        )

    def _sign(self, path: str, timestamp: int) -> str:
        base = f"{self.settings.shopee_partner_id}{path}{timestamp}"
        return hmac.new(
            self.settings.shopee_partner_key.encode(),  # type: ignore[union-attr]
            base.encode(),
            hashlib.sha256,
        ).hexdigest()

    async def publish(self, listing: ExportListing) -> dict:
        if not self.validate_credentials():
            raise ValueError("Shopee API credentials missing. Set SHOPEE_* in .env")

        path = "/api/v2/product/add_item"
        timestamp = int(time.time())
        sign = self._sign(path, timestamp)

        payload = {
            "original_price": float(listing.price),
            "description": listing.description,
            "item_name": listing.title,
            "item_sku": listing.sku,
            "currency": listing.currency,
            "stock_list": [{"stock": listing.stock}],
            "image": {"image_id_list": []},  # Upload images via /api/v2/media_space/upload_image first
            "weight": listing.weight_kg or 0.5,
            "dimension": {"package_length": 20, "package_width": 15, "package_height": 10},
        }

        params = {
            "partner_id": int(self.settings.shopee_partner_id),  # type: ignore[arg-type]
            "timestamp": timestamp,
            "sign": sign,
            "shop_id": int(self.settings.shopee_shop_id),  # type: ignore[arg-type]
            "access_token": self.settings.shopee_access_token,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.API_HOST}{path}", params=params, json=payload)
            data = resp.json()
            logger.info("Shopee publish response: {}", data)
            return data
