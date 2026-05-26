from config import TargetMarketplace
from export.base import BaseExporter
from export.lazada import LazadaExporter
from export.shopee import ShopeeExporter
from export.shopify import ShopifyExporter
from export.tiktok_shop import TikTokShopExporter

EXPORTERS: dict[str, type[BaseExporter]] = {
    "shopee": ShopeeExporter,
    "lazada": LazadaExporter,
    "tiktok_shop": TikTokShopExporter,
    "shopify": ShopifyExporter,
}


def get_exporter(marketplace: TargetMarketplace) -> BaseExporter:
    cls = EXPORTERS.get(marketplace)
    if not cls:
        raise ValueError(f"Unknown marketplace: {marketplace}")
    return cls()
