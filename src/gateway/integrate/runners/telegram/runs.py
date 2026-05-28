"""Track in-flight gateway agent runs per Telegram chat (for /stop)."""

from __future__ import annotations

import asyncio
from typing import Any


class ChatRunTracker:
    def __init__(self) -> None:
        self._tasks: dict[int, asyncio.Task[Any]] = {}

    def is_running(self, chat_id: int) -> bool:
        task = self._tasks.get(chat_id)
        return task is not None and not task.done()

    def track(self, chat_id: int, task: asyncio.Task[Any]) -> None:
        self._tasks[chat_id] = task

    def clear(self, chat_id: int) -> None:
        self._tasks.pop(chat_id, None)

    def cancel(self, chat_id: int) -> bool:
        task = self._tasks.get(chat_id)
        if task is None or task.done():
            return False
        task.cancel()
        return True


chat_runs = ChatRunTracker()
