from typing import Any

from fastapi import HTTPException

from server.deps import protected_router
from server.schemas import (
    ExportRequest,
    ExportResponse,
    ProductListResponse,
    ProductSummary,
)
from server.services.context import get_context
from server.services.export import get_export_service

router = protected_router(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    limit: int = 50,
    offset: int = 0,
    source: str | None = None,
) -> ProductListResponse:
    ctx = get_context()
    rows = ctx.store.list_products(limit=limit, offset=offset, source=source)
    items = [ProductSummary(**p) for p in rows]
    return ProductListResponse(
        items=items,
        total=ctx.store.count_products(source=source),
        limit=limit,
        offset=offset,
    )


@router.get("/{product_id}")
async def get_product(product_id: int) -> dict[str, Any]:
    product = get_context().store.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="product not found")
    return product.model_dump(mode="json")


@router.delete("/{product_id}")
async def delete_product(product_id: int) -> dict[str, str]:
    if not get_context().store.delete_product(product_id):
        raise HTTPException(status_code=404, detail="product not found")
    return {"message": "deleted", "product_id": str(product_id)}


@router.post("/export", response_model=ExportResponse)
async def export_product(req: ExportRequest) -> ExportResponse:
    if req.product_id is None and not req.url:
        raise HTTPException(status_code=400, detail="product_id or url required")
    try:
        data = await get_export_service().export_product(
            product_id=req.product_id,
            url=req.url,
            marketplace=req.marketplace,
            dry_run=req.dry_run,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ExportResponse(**data)
