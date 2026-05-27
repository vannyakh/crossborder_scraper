from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SourcePlatform(str, Enum):
    ALIBABA_1688 = "1688"
    TAOBAO = "taobao"
    ALIEXPRESS = "aliexpress"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    CUSTOM = "custom_plugin"


class ProductVariant(BaseModel):
    sku_id: str | None = None
    name: str
    price: Decimal | None = None
    stock: int | None = None
    attributes: dict[str, str] = Field(default_factory=dict)
    image_url: str | None = None


class ScrapedProduct(BaseModel):
    """Normalized product schema used across all source sites."""

    source: SourcePlatform
    source_url: str
    source_product_id: str
    title: str
    description: str | None = None
    price: Decimal | None = None
    currency: str = "CNY"
    min_order_qty: int = 1
    images: list[str] = Field(default_factory=list)
    variants: list[ProductVariant] = Field(default_factory=list)
    category: str | None = None
    seller_name: str | None = None
    seller_id: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    raw_html_path: str | None = None

    def resale_price(self, markup_percent: float = 35.0) -> Decimal | None:
        if self.price is None:
            return None
        factor = Decimal("1") + Decimal(str(markup_percent)) / Decimal("100")
        return (self.price * factor).quantize(Decimal("0.01"))


class ExportListing(BaseModel):
    """Marketplace-ready listing derived from ScrapedProduct."""

    title: str
    description: str
    price: Decimal
    currency: str
    images: list[str]
    sku: str
    stock: int = 99
    category_id: str | None = None
    weight_kg: float | None = None
    source_url: str
    source_platform: SourcePlatform
    variants: list[ProductVariant] = Field(default_factory=list)
