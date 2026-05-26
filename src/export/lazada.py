import httpx
from loguru import logger

from config import Settings
from core.models import ExportListing
from export.base import BaseExporter


class LazadaExporter(BaseExporter):
    """
    Lazada Open Platform — https://open.lazada.com/

    Uses REST API to create products (simplified payload).
    """

    marketplace = "lazada"
    API_HOST = "https://api.lazada.com.my/rest"

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def validate_credentials(self) -> bool:
        return all(
            [
                self.settings.lazada_app_key,
                self.settings.lazada_app_secret,
                self.settings.lazada_access_token,
            ]
        )

    async def publish(self, listing: ExportListing) -> dict:
        if not self.validate_credentials():
            raise ValueError("Lazada API credentials missing. Set LAZADA_* in .env")

        # Full Lazada integration requires signed requests — stub for structure
        payload = {
            "Request": {
                "Product": {
                    "PrimaryCategory": listing.category_id or "10001988",
                    "Attributes": {
                        "name": listing.title,
                        "description": listing.description,
                        "brand": "No Brand",
                    },
                    "Skus": {
                        "Sku": [
                            {
                                "SellerSku": listing.sku,
                                "quantity": str(listing.stock),
                                "price": str(listing.price),
                                "package_weight": str(listing.weight_kg or 0.5),
                            }
                        ]
                    },
                    "Images": {"Image": listing.images[:8]},
                }
            }
        }

        logger.info("Lazada publish (configure signing): sku={}", listing.sku)
        async with httpx.AsyncClient(timeout=60) as client:
            # Production: use lazop SDK with HMAC signature
            return {"status": "dry_run", "marketplace": self.marketplace, "payload": payload}
