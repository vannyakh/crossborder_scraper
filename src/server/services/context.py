"""Shared application context — settings, store, cookies."""

from __future__ import annotations

from config import Settings, get_settings
from core.cookies import CookieManager
from pipeline.storage import ProductStore

_context: AppContext | None = None


class AppContext:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.store = ProductStore(self.settings)
        self.cookies = CookieManager(self.settings.cookies_dir)

    def reload_settings(self) -> None:
        self.settings = get_settings()

    def schedule_engine_reset(self) -> None:
        """Drop warm browser pool after panel config changes (best-effort)."""
        import asyncio

        from server.services.engine import get_engine_service

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(get_engine_service().shutdown())
        except RuntimeError:
            pass


def get_context() -> AppContext:
    global _context
    if _context is None:
        _context = AppContext()
    return _context
