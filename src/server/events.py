import asyncio
import json
from dataclasses import dataclass
from typing import Any


@dataclass
class BatchEvent:
    type: str
    data: dict[str, Any]


class BatchEventBus:
    """In-process pub/sub for batch SSE streams."""

    def __init__(self) -> None:
        self._subs: dict[str, list[asyncio.Queue[BatchEvent | None]]] = {}

    def subscribe(self, batch_id: str) -> asyncio.Queue[BatchEvent | None]:
        queue: asyncio.Queue[BatchEvent | None] = asyncio.Queue(maxsize=256)
        self._subs.setdefault(batch_id, []).append(queue)
        return queue

    def unsubscribe(self, batch_id: str, queue: asyncio.Queue[BatchEvent | None]) -> None:
        subs = self._subs.get(batch_id, [])
        if queue in subs:
            subs.remove(queue)
        if not subs:
            self._subs.pop(batch_id, None)

    async def publish(self, batch_id: str, event_type: str, data: dict[str, Any]) -> None:
        event = BatchEvent(type=event_type, data=data)
        for queue in list(self._subs.get(batch_id, [])):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass

    async def close_batch(self, batch_id: str) -> None:
        for queue in list(self._subs.get(batch_id, [])):
            try:
                queue.put_nowait(None)
            except asyncio.QueueFull:
                pass
        self._subs.pop(batch_id, None)


def sse_frame(event_type: str, data: dict[str, Any]) -> str:
    payload = json.dumps(data, default=str)
    return f"event: {event_type}\ndata: {payload}\n\n"


batch_events = BatchEventBus()
