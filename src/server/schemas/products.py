from typing import Any

from pydantic import BaseModel

from config import TargetMarketplace


class ProductSummary(BaseModel):
    id: int
    source: str
    source_product_id: str
    source_url: str
    title: str
    created_at: str
    updated_at: str


class ProductListResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    limit: int
    offset: int


class ExportRequest(BaseModel):
    product_id: int | None = None
    url: str | None = None
    marketplace: TargetMarketplace
    dry_run: bool = True


class ExportResponse(BaseModel):
    marketplace: str
    dry_run: bool
    listing: dict[str, Any]
    published: bool = False
    api_response: dict[str, Any] | None = None
