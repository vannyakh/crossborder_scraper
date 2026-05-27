from fastapi import HTTPException

from server.deps import protected_router
from server.schemas import BatchDetailResponse, BatchListResponse, BatchSummary
from server.services.context import get_context

router = protected_router(prefix="/batches", tags=["batches"])


@router.get("", response_model=BatchListResponse)
async def list_batches(limit: int = 30, offset: int = 0) -> BatchListResponse:
    ctx = get_context()
    items = [BatchSummary(**b) for b in ctx.store.list_batches(limit=limit, offset=offset)]
    return BatchListResponse(
        items=items,
        total=ctx.store.count_batches(),
        limit=limit,
        offset=offset,
    )


@router.get("/{batch_id}", response_model=BatchDetailResponse)
async def get_batch(batch_id: str) -> BatchDetailResponse:
    batch = get_context().store.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="batch not found")
    return BatchDetailResponse(**batch)
