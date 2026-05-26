from typing import Any

from fastapi import HTTPException

from server.deps import protected_router
from server.manager import get_manager
from server.schemas import (
    ExportRequest,
    ExportResponse,
    ProductListResponse,
    ProductSummary,
)

router = protected_router(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    limit: int = 50,
    offset: int = 0,
    source: str | None = None,
) -> ProductListResponse:
    mgr = get_manager()
    items = [ProductSummary(**p) for p in mgr.store.list_products(limit=limit, offset=offset, source=source)]
    return ProductListResponse(
        items=items,
        total=mgr.store.count_products(source=source),
        limit=limit,
        offset=offset,
    )


@router.get("/{product_id}")
async def get_product(product_id: int) -> dict[str, Any]:
    product = get_manager().store.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="product not found")
    return product.model_dump(mode="json")


@router.delete("/{product_id}")
async def delete_product(product_id: int) -> dict[str, str]:
    if not get_manager().store.delete_product(product_id):
        raise HTTPException(status_code=404, detail="product not found")
    return {"message": "deleted", "product_id": str(product_id)}


@router.post("/export", response_model=ExportResponse)
async def export_product(req: ExportRequest) -> ExportResponse:
    if req.product_id is None and not req.url:
        raise HTTPException(status_code=400, detail="product_id or url required")
    try:
        data = await get_manager().export_product(
            product_id=req.product_id,
            url=req.url,
            marketplace=req.marketplace,
            dry_run=req.dry_run,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ExportResponse(**data)
