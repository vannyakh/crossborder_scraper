"""Marketplace export operations."""

from __future__ import annotations

from typing import Any

from export.registry import get_exporter
from pipeline.normalize import to_export_listing
from server.services.context import AppContext, get_context


class ExportService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    async def export_product(
        self,
        *,
        product_id: int | None,
        url: str | None,
        marketplace: str,
        dry_run: bool,
    ) -> dict[str, Any]:
        product = None
        if product_id is not None:
            product = self._ctx.store.get_by_id(product_id)
        elif url:
            product = self._ctx.store.get_by_url(url)
        if not product:
            raise ValueError("product not found")

        listing = to_export_listing(product, self._ctx.settings)
        exporter = get_exporter(marketplace)  # type: ignore[arg-type]
        payload = listing.model_dump(mode="json")

        if dry_run:
            return {
                "marketplace": marketplace,
                "dry_run": True,
                "listing": payload,
                "published": False,
                "api_response": None,
            }

        if not exporter.validate_credentials():
            raise ValueError(f"{marketplace} credentials not configured")

        api_response = await exporter.publish(listing)
        return {
            "marketplace": marketplace,
            "dry_run": False,
            "listing": payload,
            "published": True,
            "api_response": api_response,
        }


_export: ExportService | None = None


def get_export_service() -> ExportService:
    global _export
    if _export is None:
        _export = ExportService()
    return _export
