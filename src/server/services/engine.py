"""Shared scrape engine — reuse browser pool across single-URL gateway/CLI scrapes."""

from __future__ import annotations

import asyncio

from core.engine import ScrapeEngine
from server.services.context import AppContext, get_context


class EngineService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()
        self._engine: ScrapeEngine | None = None
        self._lock = asyncio.Lock()

    async def get_engine(self, *, max_workers: int | None = None) -> ScrapeEngine:
        """Return a warm engine; recreates pool if worker count changes."""
        async with self._lock:
            workers = max_workers or 1
            if self._engine is not None and self._engine.max_workers != workers:
                await self._engine.shutdown_pool()
                self._engine = None
            if self._engine is None:
                self._engine = ScrapeEngine(self._ctx.settings, max_workers=workers)
                await self._engine.ensure_pool()
            return self._engine

    async def shutdown(self) -> None:
        async with self._lock:
            if self._engine is not None:
                await self._engine.shutdown_pool()
                self._engine = None


_engine: EngineService | None = None


def get_engine_service() -> EngineService:
    global _engine
    if _engine is None:
        _engine = EngineService()
    return _engine
