import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.auth import authenticate_websocket
from server.core.events import batch_events, ws_message
from server.services.batch import get_batch_service

router = APIRouter(prefix="/jobs", tags=["realtime"])

_TERMINAL_EVENTS = frozenset({"batch_complete", "batch_cancelled", "batch_failed"})


@router.websocket("/{batch_id}/ws")
async def batch_websocket(websocket: WebSocket, batch_id: str) -> None:
    username = authenticate_websocket(websocket)
    if username is None:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    batch = get_batch_service()
    status = batch.get_batch_status(batch_id)
    if not status:
        await websocket.close(code=4404, reason="batch not found")
        return

    await websocket.accept()
    queue = batch_events.subscribe(batch_id)
    try:
        await websocket.send_text(ws_message("status", status))
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=20.0)
            except TimeoutError:
                await websocket.send_text(ws_message("heartbeat", {"batch_id": batch_id}))
                continue
            if event is None:
                break
            await websocket.send_text(ws_message(event.type, event.data))
            if event.type in _TERMINAL_EVENTS:
                break
    except WebSocketDisconnect:
        pass
    finally:
        batch_events.unsubscribe(batch_id, queue)
