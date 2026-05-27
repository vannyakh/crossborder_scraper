import asyncio
import time
from collections.abc import Callable
from typing import Any

from config import Settings
from core.ai import AIExtractor, ScrapeAgent
from core.cookies import CookieManager
from core.engine.jobs import BatchReport, JobResult, JobStatus, ScrapeJob
from core.engine.pipeline import PhaseEvent, run_scrape_pipeline
from core.engine.pool import BrowserPool
from core.proxy import ProxyPool
from pipeline.storage import ProductStore


class ScrapeEngine:
    """
    Concurrent scrape engine: worker pool, proxy rotation, cookies, unified AI pipeline.

    Each job runs ``run_scrape_pipeline`` (resolve → fetch → parse → AI → agent) so
    gateway tools and the panel agent see the same stage order and phase events.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        max_workers: int | None = None,
        on_job_complete: Callable[[JobResult], Any] | None = None,
        on_job_phase: Callable[[str, PhaseEvent], Any] | None = None,
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
        self._on_job_phase = on_job_phase
        self._running = False
        self._pool_started = False

    async def ensure_pool(self) -> None:
        if not self._pool_started:
            await self.pool.start()
            self._pool_started = True

    async def shutdown_pool(self) -> None:
        if self._pool_started:
            await self.pool.stop()
            self._pool_started = False

    async def __aenter__(self) -> "ScrapeEngine":
        await self.ensure_pool()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.shutdown_pool()

    def _resolve_proxy(self, job: ScrapeJob, worker_id: int):
        if self.proxy_pool.size == 0:
            return None
        strategy = self.settings.proxy_rotation_strategy
        index = job.proxy_index if job.proxy_index is not None else worker_id
        return self.proxy_pool.get(index, strategy)

    def _phase_callback(self, job_id: str):
        if not self._on_job_phase:
            return None

        def _cb(event: PhaseEvent) -> None:
            self._on_job_phase(job_id, event)

        return _cb

    async def run_job(self, job: ScrapeJob, worker_id: int = 0) -> JobResult:
        """Execute a single scrape job through the unified pipeline."""
        start = time.perf_counter()
        proxy = self._resolve_proxy(job, worker_id)
        proxy_label = proxy.server if proxy else None

        async with self._semaphore:
            await self.ensure_pool()
            pipeline = await run_scrape_pipeline(
                job,
                settings=self.settings,
                pool=self.pool,
                ai=self.ai,
                agent=self.agent,
                worker_id=worker_id,
                proxy=proxy,
                on_phase=self._phase_callback(job.id),
            )

            duration = time.perf_counter() - start
            phase_dicts = [p.to_dict() for p in pipeline.phases]

            if pipeline.error or not pipeline.product:
                result = JobResult(
                    job_id=job.id,
                    url=job.url,
                    status=JobStatus.FAILED,
                    error=pipeline.error or "Scrape produced no product",
                    duration_seconds=round(duration, 2),
                    worker_id=worker_id,
                    proxy_used=proxy_label,
                    site_key=pipeline.site_key,
                    phases=phase_dicts,
                )
            else:
                result = JobResult(
                    job_id=job.id,
                    url=job.url,
                    status=JobStatus.SUCCESS,
                    product=pipeline.product,
                    duration_seconds=round(duration, 2),
                    worker_id=worker_id,
                    proxy_used=proxy_label,
                    site_key=pipeline.site_key,
                    ai_used=pipeline.ai_used,
                    ai_extract_used=pipeline.ai_extract_used,
                    agent_used=pipeline.agent_used,
                    phases=phase_dicts,
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
        store = ProductStore(self.settings) if save else None

        done_count = 0
        done_lock = asyncio.Lock()

        async def _worker(job: ScrapeJob, idx: int) -> JobResult:
            nonlocal done_count
            worker_id = idx % self.max_workers
            result = await self.run_job(job, worker_id=worker_id)
            if store and result.product:
                store.save(result.product)
                store.export_json_file(result.product)
            if progress:
                async with done_lock:
                    done_count += 1
                    progress(done_count, len(jobs), result)
            return result

        try:
            await self.ensure_pool()
            tasks = [_worker(job, i) for i, job in enumerate(jobs)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        finally:
            if not self._running:
                await self.shutdown_pool()

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
        await self.ensure_pool()
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
        await self.shutdown_pool()

    async def submit(self, job: ScrapeJob) -> None:
        await self._queue.put(job)

    async def drain(self) -> None:
        await self._queue.join()
