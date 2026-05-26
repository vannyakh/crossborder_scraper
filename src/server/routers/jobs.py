import asyncio

from fastapi import Depends, HTTPException
from fastapi.responses import StreamingResponse

from core.engine.jobs import BatchReport
from server.auth import require_panel_auth
from server.core.events import batch_events, sse_frame
from server.deps import protected_router
from server.schemas import (
    MessageResponse,
    ScrapeSingleRequest,
    ScrapeSingleResponse,
    StatusResponse,
    SubmitRequest,
    SubmitResponse,
)
from server.services.audit import log_operation
from server.services.batch import get_batch_service
from server.services.product import get_product_service

router = protected_router(prefix="/jobs", tags=["jobs"])


@router.post("/submit", response_model=SubmitResponse)
async def submit(
    req: SubmitRequest,
    username: str = Depends(require_panel_auth),
) -> SubmitResponse:
    batch_id = await get_batch_service().submit_batch(
        req.urls,
        workers=req.workers,
        use_ai=req.use_ai,
        save=req.save,
        session_id=req.session_id,
        submitted_by=username,
    )
    log_operation(
        user=username,
        operation_type="Batch submit",
        details=f"Submitted batch {batch_id} with {len(req.urls)} URL(s)",
        meta={"batch_id": batch_id},
    )
    return SubmitResponse(batch_id=batch_id, total=len(req.urls))


@router.post("/scrape", response_model=ScrapeSingleResponse)
async def scrape_one(req: ScrapeSingleRequest) -> ScrapeSingleResponse:
    try:
        result, product_id = await get_product_service().scrape_single(
            req.url,
            use_ai=req.use_ai,
            save=req.save,
            session_id=req.session_id,
        )
    except Exception as exc:
        return ScrapeSingleResponse(
            job_id="",
            status="failed",
            error=str(exc),
        )

    return ScrapeSingleResponse(
        job_id=result.job_id,
        status="success" if result.status.value == "success" else "failed",
        product_id=product_id,
        result=result,
        error=result.error,
    )


@router.get("/{batch_id}/status", response_model=StatusResponse)
async def batch_status(batch_id: str) -> StatusResponse:
    st = get_batch_service().get_batch_status(batch_id)
    if not st:
        raise HTTPException(status_code=404, detail="batch not found")
    return StatusResponse(**st)


@router.get("/{batch_id}/stream")
async def batch_stream(batch_id: str) -> StreamingResponse:
    batch = get_batch_service()
    st = batch.get_batch_status(batch_id)
    if not st:
        raise HTTPException(status_code=404, detail="batch not found")

    async def event_generator():
        queue = batch_events.subscribe(batch_id)
        yield sse_frame("status", st)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                except TimeoutError:
                    yield sse_frame("heartbeat", {"batch_id": batch_id})
                    continue
                if event is None:
                    break
                yield sse_frame(event.type, event.data)
                if event.type in ("batch_complete", "batch_cancelled", "batch_failed"):
                    break
        finally:
            batch_events.unsubscribe(batch_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{batch_id}/result")
async def batch_result(batch_id: str) -> BatchReport | dict:
    result = get_batch_service().get_batch_result(batch_id)
    if not result:
        raise HTTPException(status_code=404, detail="batch not found")
    return result


@router.post("/{batch_id}/cancel", response_model=MessageResponse)
async def cancel_batch(batch_id: str) -> MessageResponse:
    batch = get_batch_service()
    cancelled = await batch.cancel_batch(batch_id)
    if not cancelled:
        st = batch.get_batch_status(batch_id)
        if not st:
            raise HTTPException(status_code=404, detail="batch not found")
        return MessageResponse(message="batch is not running", batch_id=batch_id)
    return MessageResponse(message="cancellation requested", batch_id=batch_id)
