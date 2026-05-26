from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from core.engine.jobs import BatchReport
from server.deps import protected_router
from server.events import batch_events, sse_frame
from server.manager import get_manager
from server.schemas import (
    MessageResponse,
    ScrapeSingleRequest,
    ScrapeSingleResponse,
    StatusResponse,
    SubmitRequest,
    SubmitResponse,
)

router = protected_router(prefix="/jobs", tags=["jobs"])


@router.post("/submit", response_model=SubmitResponse)
async def submit(req: SubmitRequest) -> SubmitResponse:
    mgr = get_manager()
    batch_id = await mgr.submit_batch(
        req.urls,
        workers=req.workers,
        use_ai=req.use_ai,
        save=req.save,
        session_id=req.session_id,
    )
    return SubmitResponse(batch_id=batch_id, total=len(req.urls))


@router.post("/scrape", response_model=ScrapeSingleResponse)
async def scrape_one(req: ScrapeSingleRequest) -> ScrapeSingleResponse:
    mgr = get_manager()
    try:
        result, product_id = await mgr.scrape_single(
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
    st = get_manager().get_batch_status(batch_id)
    if not st:
        raise HTTPException(status_code=404, detail="batch not found")
    return StatusResponse(**st)


@router.get("/{batch_id}/stream")
async def batch_stream(batch_id: str) -> StreamingResponse:
    mgr = get_manager()
    st = mgr.get_batch_status(batch_id)
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
    result = get_manager().get_batch_result(batch_id)
    if not result:
        raise HTTPException(status_code=404, detail="batch not found")
    return result


@router.post("/{batch_id}/cancel", response_model=MessageResponse)
async def cancel_batch(batch_id: str) -> MessageResponse:
    cancelled = await get_manager().cancel_batch(batch_id)
    if not cancelled:
        st = get_manager().get_batch_status(batch_id)
        if not st:
            raise HTTPException(status_code=404, detail="batch not found")
        return MessageResponse(message="batch is not running", batch_id=batch_id)
    return MessageResponse(message="cancellation requested", batch_id=batch_id)
