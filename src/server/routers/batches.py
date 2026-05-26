from fastapi import APIRouter, HTTPException

from server.manager import get_manager
from server.schemas import BatchDetailResponse, BatchListResponse, BatchSummary

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=BatchListResponse)
async def list_batches(limit: int = 30, offset: int = 0) -> BatchListResponse:
    mgr = get_manager()
    items = [BatchSummary(**b) for b in mgr.store.list_batches(limit=limit, offset=offset)]
    return BatchListResponse(
        items=items,
        total=mgr.store.count_batches(),
        limit=limit,
        offset=offset,
    )


@router.get("/{batch_id}", response_model=BatchDetailResponse)
async def get_batch(batch_id: str) -> BatchDetailResponse:
    batch = get_manager().store.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="batch not found")
    return BatchDetailResponse(**batch)
