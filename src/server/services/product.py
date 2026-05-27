"""Single-product scrape operations."""

from __future__ import annotations

from core.engine import JobResult, ScrapeJob
from server.services.context import AppContext, get_context
from server.services.engine import get_engine_service


class ProductService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    async def scrape_single(
        self,
        url: str,
        *,
        use_ai: bool | None = None,
        save: bool = True,
        session_id: str | None = None,
    ) -> tuple[JobResult, int | None]:
        engine = await get_engine_service().get_engine(max_workers=1)
        job = ScrapeJob(url=url, use_ai=use_ai, session_id=session_id)
        result = await engine.run_job(job)
        product_id: int | None = None
        if save and result.product:
            product_id = self._ctx.store.save(result.product)
            self._ctx.store.export_json_file(result.product)
        return result, product_id


_product: ProductService | None = None


def get_product_service() -> ProductService:
    global _product
    if _product is None:
        _product = ProductService()
    return _product
