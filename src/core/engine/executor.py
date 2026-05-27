import asyncio
import time
from collections.abc import Callable
from typing import Any

from loguru import logger

from config import Settings
from core.ai import AIExtractor, ScrapeAgent
from core.cookies import CookieManager
from core.engine.jobs import BatchReport, JobResult, JobStatus, ScrapeJob
from core.engine.pool import BrowserPool
from core.models import ScrapedProduct
from core.proxy import ProxyPool
from pipeline.storage import ProductStore


class ScrapeEngine:
    """
    Concurrent scrape engine: multiple jobs, worker pool, proxy rotation, cookies, AI fallback.

    Uses asyncio for parallel browser jobs (recommended for Playwright).
    CPU-bound AI calls run in a thread pool via asyncio.to_thread when needed.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        max_workers: int | None = None,
        on_job_complete: Callable[[JobResult], Any] | None = None,
    ):
        self.settings = settings or Settings()
        self.settings.ensure_dirs()
        self.max_workers = max_workers or self.settings.max_concurrent_jobs
        self.proxy_pool = ProxyPool.from_settings(
            self.settings.proxy_server,
            self.settings.proxy_list_path,
        )
        self.cookies = CookieManager(self.settings.cookies_dir)
        self.pool = BrowserPool(
            self.settings,
            proxy_pool=self.proxy_pool,
            cookie_manager=self.cookies,
            pool_size=self.max_workers,
        )
        self.ai = AIExtractor(self.settings)
        self.agent = ScrapeAgent(self.settings)
        self._semaphore = asyncio.Semaphore(self.max_workers)
        self._queue: asyncio.Queue[ScrapeJob | None] = asyncio.Queue()
        self._on_job_complete = on_job_complete
        self._running = False

    async def __aenter__(self) -> "ScrapeEngine":
        await self.pool.start()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.pool.stop()

    def _resolve_proxy(self, job: ScrapeJob, worker_id: int):
        if self.proxy_pool.size == 0:
            return None
        strategy = self.settings.proxy_rotation_strategy
        return self.proxy_pool.get(job.proxy_index if job.proxy_index is not None else worker_id, strategy)

    async def run_job(self, job: ScrapeJob, worker_id: int = 0) -> JobResult:
        """Execute a single scrape job."""
        start = time.perf_counter()
        proxy = self._resolve_proxy(job, worker_id)
        proxy_label = proxy.server if proxy else None
        use_ai = job.use_ai if job.use_ai is not None else self.settings.ai_enabled
        ai_used = False

        async with self._semaphore:
            try:
                from sites.registry import get_scraper_for_url

                scraper = get_scraper_for_url(job.url)
                site_key = job.site_key or scraper.site_key
                html = ""

                if getattr(scraper, "sandboxed", False):
                    product = await scraper.scrape_product(job.url)
                else:
                    async with self.pool.page_session(
                        site_key=site_key,
                        worker_id=worker_id,
                        proxy=proxy,
                        session_id=job.session_id,
                    ) as (page, _ctx):
                        html = await scraper.fetch_page(page, job.url)
                        product = await scraper.parse_html(job.url, html)

                        if self.settings.output_dir:
                            raw = scraper._save_raw_html(job.url, html)
                            product.raw_html_path = str(raw)

                # AI fallback when CSS parse is weak or forced
                need_ai = use_ai and self.ai.enabled
                if need_ai and html and (
                    job.use_ai is True
                    or (self.settings.ai_fallback and self.ai.is_parse_incomplete(product))
                ):
                    logger.info("[{}] AI extraction for {}", job.id, job.url)
                    product = await self.ai.extract(
                        html,
                        job.url,
                        scraper.platform,
                        scraper.extract_product_id(job.url) or "unknown",
                    )
                    ai_used = True

                if self.agent.enabled and (ai_used or use_ai):
                    logger.info("[{}] AI agent validate/enrich for {}", job.id, job.url)
                    product = await self.agent.validate_and_enrich(product)
                    ai_used = True

                duration = time.perf_counter() - start
                result = JobResult(
                    job_id=job.id,
                    url=job.url,
                    status=JobStatus.SUCCESS,
                    product=product,
                    duration_seconds=round(duration, 2),
                    worker_id=worker_id,
                    proxy_used=proxy_label,
                    ai_used=ai_used,
                )
            except Exception as exc:
                duration = time.perf_counter() - start
                logger.error("[{}] Job failed: {} — {}", job.id, job.url, exc)
                result = JobResult(
                    job_id=job.id,
                    url=job.url,
                    status=JobStatus.FAILED,
                    error=str(exc),
                    duration_seconds=round(duration, 2),
                    worker_id=worker_id,
                    proxy_used=proxy_label,
                )

        if self._on_job_complete:
            self._on_job_complete(result)
        return result

    async def run_batch(
        self,
        jobs: list[ScrapeJob],
        *,
        save: bool = True,
        progress: Callable[[int, int, JobResult], Any] | None = None,
    ) -> BatchReport:
        """Run many jobs concurrently with worker limit."""
        report = BatchReport(total=len(jobs))

        done_count = 0
        done_lock = asyncio.Lock()

        async def _worker(job: ScrapeJob, idx: int) -> JobResult:
            nonlocal done_count
            worker_id = idx % self.max_workers
            result = await self.run_job(job, worker_id=worker_id)
            if save and result.product:
                store = ProductStore(self.settings)
                store.save(result.product)
                store.export_json_file(result.product)
            if progress:
                async with done_lock:
                    done_count += 1
                    progress(done_count, len(jobs), result)
            return result

        async with self:
            tasks = [_worker(job, i) for i, job in enumerate(jobs)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for r in results:
            if isinstance(r, Exception):
                report.failed += 1
                report.results.append(
                    JobResult(job_id="?", url="", status=JobStatus.FAILED, error=str(r))
                )
            elif isinstance(r, JobResult):
                report.results.append(r)
                if r.status == JobStatus.SUCCESS:
                    report.success += 1
                else:
                    report.failed += 1

        from datetime import datetime

        report.finished_at = datetime.utcnow()
        return report

    async def run_urls(
        self,
        urls: list[str],
        *,
        save: bool = True,
        use_ai: bool | None = None,
    ) -> BatchReport:
        jobs = [ScrapeJob(url=u, use_ai=use_ai) for u in urls]
        return await self.run_batch(jobs, save=save)

    async def worker_loop(self, worker_id: int) -> None:
        """Long-running worker consuming from internal queue."""
        while self._running:
            try:
                job = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except TimeoutError:
                continue
            if job is None:
                break
            await self.run_job(job, worker_id=worker_id)
            self._queue.task_done()

    async def start_workers(self) -> None:
        """Start N async workers + browser pool (for streaming job submission)."""
        await self.pool.start()
        self._running = True
        self._worker_tasks = [
            asyncio.create_task(self.worker_loop(i)) for i in range(self.max_workers)
        ]

    async def stop_workers(self) -> None:
        self._running = False
        for _ in range(self.max_workers):
            await self._queue.put(None)
        if hasattr(self, "_worker_tasks"):
            await asyncio.gather(*self._worker_tasks, return_exceptions=True)
        await self.pool.stop()

    async def submit(self, job: ScrapeJob) -> None:
        await self._queue.put(job)

    async def drain(self) -> None:
        await self._queue.join()
