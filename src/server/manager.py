"""Backward-compatible facade — delegates to focused services."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from core.engine import BatchReport, JobResult
from server.services.batch import get_batch_service
from server.services.config import get_config_service
from server.services.context import get_context
from server.services.export import get_export_service
from server.services.product import get_product_service
from server.services.runtime import build_runtime_status, get_stats


class ScrapeManager:
    """Thin facade over domain services for legacy callers and gateway tools."""

    @property
    def settings(self):
        return get_context().settings

    @property
    def store(self):
        return get_context().store

    @property
    def cookies(self):
        return get_context().cookies

    def reload_settings(self) -> None:
        get_context().reload_settings()

    def get_panel_config(self) -> dict[str, Any]:
        return get_config_service().get_panel_config()

    def update_panel_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        return get_config_service().update_panel_config(updates)

    def get_ai_config(self) -> dict[str, Any]:
        return get_config_service().get_ai_config()

    def update_ai_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        return get_config_service().update_ai_config(updates)

    def get_config(self) -> dict[str, Any]:
        return get_config_service().get_config()

    def get_stats(self) -> dict[str, Any]:
        return get_stats()

    def get_runtime_status(self, *, started_at: datetime) -> dict[str, Any]:
        return build_runtime_status(started_at=started_at)

    async def submit_batch(
        self,
        urls: list[str],
        *,
        workers: int | None = None,
        use_ai: bool | None = None,
        save: bool = True,
        session_id: str | None = None,
        submitted_by: str | None = None,
    ) -> str:
        return await get_batch_service().submit_batch(
            urls,
            workers=workers,
            use_ai=use_ai,
            save=save,
            session_id=session_id,
            submitted_by=submitted_by,
        )

    async def cancel_batch(self, batch_id: str) -> bool:
        return await get_batch_service().cancel_batch(batch_id)

    def get_batch_status(self, batch_id: str) -> dict[str, Any] | None:
        return get_batch_service().get_batch_status(batch_id)

    def get_batch_result(self, batch_id: str) -> BatchReport | dict | None:
        return get_batch_service().get_batch_result(batch_id)

    async def scrape_single(
        self,
        url: str,
        *,
        use_ai: bool | None = None,
        save: bool = True,
        session_id: str | None = None,
    ) -> tuple[JobResult, int | None]:
        return await get_product_service().scrape_single(
            url,
            use_ai=use_ai,
            save=save,
            session_id=session_id,
        )

    async def export_product(
        self,
        *,
        product_id: int | None,
        url: str | None,
        marketplace: str,
        dry_run: bool,
    ) -> dict[str, Any]:
        return await get_export_service().export_product(
            product_id=product_id,
            url=url,
            marketplace=marketplace,
            dry_run=dry_run,
        )


_manager: ScrapeManager | None = None


def get_manager() -> ScrapeManager:
    global _manager
    if _manager is None:
        _manager = ScrapeManager()
    return _manager
