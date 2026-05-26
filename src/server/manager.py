import asyncio
from datetime import datetime
from typing import Any

from loguru import logger

from config import Settings, get_settings
from export.registry import EXPORTERS
from config.ui_store import (
    PANEL_SCALAR_KEYS,
    UI_CONFIG_PATH,
    mask_api_key,
    panel_config_for_api,
    save_panel_config,
)
from core.cookies import CookieManager
from core.engine import BatchReport, JobResult, ScrapeEngine, ScrapeJob
from core.engine.jobs import JobStatus
from export.registry import get_exporter
from pipeline.normalize import to_export_listing
from pipeline.storage import ProductStore
from server.events import batch_events


class ScrapeManager:
    """
    Central server controller: scrape processing, SQLite persistence, and output files.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.store = ProductStore(self.settings)
        self.cookies = CookieManager(self.settings.cookies_dir)
        self._lock = asyncio.Lock()
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._live_status: dict[str, dict[str, Any]] = {}
        self._live_reports: dict[str, BatchReport] = {}

    def reload_settings(self) -> None:
        self.settings = get_settings()

    def _schedule_event(self, batch_id: str, event_type: str, data: dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(batch_events.publish(batch_id, event_type, data))

    def _emit_status(self, batch_id: str) -> None:
        st = self._live_status.get(batch_id)
        if not st:
            return
        self._schedule_event(batch_id, "status", {**st})

    def get_panel_config(self) -> dict[str, Any]:
        s = self.settings
        data = panel_config_for_api(mask_secrets=True)
        data["ai_api_key_set"] = bool(s.ai_api_key)
        data["ai_base_url"] = s.ai_base_url
        data["proxy_server_set"] = bool(s.proxy_server)
        max_jobs = s.max_concurrent_jobs
        workers = data.get("scrape_default_workers") or max_jobs
        data["scrape_default_workers"] = min(int(workers), max_jobs)
        data["secrets_from_env"] = False
        data["secrets_from_panel_config"] = True
        mp_out: dict[str, Any] = {}
        for pid, entry in data.get("marketplaces", {}).items():
            mp_out[pid] = {
                **entry,
                "supports_export": pid in EXPORTERS,
            }
        data["marketplaces"] = mp_out
        return data

    def update_panel_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        scalar: dict[str, Any] = {}
        marketplace_updates = updates.pop("marketplaces", None)
        for key in PANEL_SCALAR_KEYS:
            if key in updates:
                scalar[key] = updates[key]
        if scalar.get("scrape_default_workers") is not None:
            cap = self.settings.max_concurrent_jobs or 3
            scalar["scrape_default_workers"] = min(int(scalar["scrape_default_workers"]), cap)
        if scalar or marketplace_updates:
            save_panel_config(
                scalar_updates=scalar or None,
                marketplace_updates=marketplace_updates,
            )
            self.reload_settings()
        return self.get_panel_config()

    def get_ai_config(self) -> dict[str, Any]:
        s = self.settings
        panel = panel_config_for_api(mask_secrets=True)
        return {
            "ai_enabled": s.ai_enabled,
            "ai_fallback": s.ai_fallback,
            "ai_agent_enabled": s.ai_agent_enabled,
            "ai_model": s.ai_model,
            "ai_base_url": s.ai_base_url,
            "ai_max_html_chars": s.ai_max_html_chars,
            "ai_timeout_seconds": s.ai_timeout_seconds,
            "ai_api_key_set": bool(s.ai_api_key),
            "ai_api_key_masked": panel.get("ai_api_key_masked") or mask_api_key(s.ai_api_key),
            "ui_config_path": str(UI_CONFIG_PATH),
            "secrets_from_env": False,
        }

    def update_ai_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        return self.update_panel_config(updates)

    def get_config(self) -> dict[str, Any]:
        s = self.settings
        return {
            "max_concurrent_jobs": s.max_concurrent_jobs,
            "scrape_default_workers": s.scrape_default_workers or s.max_concurrent_jobs,
            "proxy_list_path": str(s.proxy_list_path) if s.proxy_list_path else None,
            "proxy_rotation_strategy": s.proxy_rotation_strategy,
            "ai_enabled": s.ai_enabled,
            "ai_fallback": s.ai_fallback,
            "ai_agent_enabled": s.ai_agent_enabled,
            "ai_model": s.ai_model,
            "cookies_dir": str(s.cookies_dir),
            "output_dir": str(s.output_dir),
            "db_path": str(s.db_path),
            "headless": s.headless,
            "price_markup_percent": s.price_markup_percent,
            "ui_config_path": str(UI_CONFIG_PATH),
            "secrets_from_env": False,
            "secrets_from_panel_config": True,
        }

    def get_stats(self) -> dict[str, Any]:
        sessions: dict[str, list[str]] = {}
        for site in ("1688", "taobao", "aliexpress"):
            found = self.cookies.list_sessions(site)
            if found:
                sessions[site] = found
        running = sum(1 for s in self._live_status.values() if s.get("running"))
        return {
            "products": self.store.count_products(),
            "batches": self.store.count_batches(),
            "output_files": len(self.store.list_output_files()),
            "running_batches": running,
            "cookies_sessions": sessions,
        }

    def get_runtime_status(self, *, started_at: datetime) -> dict[str, Any]:
        from core.proxy import ProxyPool

        s = self.settings
        proxy_pool = ProxyPool.from_settings(s.proxy_server, s.proxy_list_path)
        running_batches = []
        for batch_id, st in self._live_status.items():
            running_batches.append(
                {
                    "batch_id": batch_id,
                    "status": st.get("status", "running"),
                    "completed": st.get("completed", 0),
                    "total": st.get("total", 0),
                    "success": st.get("success", 0),
                    "failed": st.get("failed", 0),
                    "running": bool(st.get("running")),
                }
            )

        uptime = (datetime.utcnow() - started_at).total_seconds()
        return {
            "service": "crossborder-scraper",
            "version": "0.3.0",
            "started_at": started_at,
            "uptime_seconds": round(uptime, 1),
            "running_batches": running_batches,
            "active_tasks": len(self._tasks),
            "ai": self.get_ai_config(),
            "engine": {
                "max_concurrent_jobs": s.max_concurrent_jobs,
                "headless": s.headless,
                "proxy_count": proxy_pool.size,
                "browser_mode": "on_demand",
            },
            "storage": {
                "products": self.store.count_products(),
                "batches": self.store.count_batches(),
                "output_files": len(self.store.list_output_files()),
                "db_path": str(s.db_path),
                "output_dir": str(s.output_dir),
            },
            "cookies_sessions": self.get_stats()["cookies_sessions"],
        }

    async def submit_batch(
        self,
        urls: list[str],
        *,
        workers: int | None = None,
        use_ai: bool | None = None,
        save: bool = True,
        session_id: str | None = None,
    ) -> str:
        engine = ScrapeEngine(self.settings, max_workers=workers)
        jobs = [
            ScrapeJob(url=u, use_ai=use_ai, session_id=session_id)
            for u in urls
        ]
        report = BatchReport(total=len(jobs))
        batch_id = report.batch_id

        async with self._lock:
            self.store.create_batch(
                batch_id,
                total=len(jobs),
                workers=workers,
                use_ai=bool(use_ai),
                save=save,
            )
            self._live_reports[batch_id] = report
            self._live_status[batch_id] = {
                "started_at": datetime.utcnow(),
                "running": True,
                "completed": 0,
                "total": len(jobs),
                "success": 0,
                "failed": 0,
                "status": "running",
            }
            self._emit_status(batch_id)
            self._schedule_event(
                batch_id,
                "batch_started",
                {"batch_id": batch_id, "total": len(jobs)},
            )

        async def _run() -> None:
            def _progress(done: int, _total: int, result: JobResult) -> None:
                st = self._live_status.get(batch_id)
                if not st:
                    return
                st["completed"] = done
                if result.status == JobStatus.SUCCESS:
                    st["success"] = st.get("success", 0) + 1
                else:
                    st["failed"] = st.get("failed", 0) + 1
                report = self._live_reports.get(batch_id)
                if report is not None:
                    report.results.append(result)
                    report.success = st["success"]
                    report.failed = st["failed"]
                self.store.update_batch_progress(
                    batch_id,
                    completed=done,
                    success=st["success"],
                    failed=st["failed"],
                )
                self._emit_status(batch_id)
                self._schedule_event(
                    batch_id,
                    "job_done",
                    {
                        "job_id": result.job_id,
                        "url": result.url,
                        "status": result.status.value,
                        "error": result.error,
                        "duration_seconds": result.duration_seconds,
                        "ai_used": result.ai_used,
                        "proxy_used": result.proxy_used,
                        "product_title": result.product.title if result.product else None,
                    },
                )

            try:
                final = await engine.run_batch(jobs, save=save, progress=_progress)
                async with self._lock:
                    self._live_reports[batch_id] = final
                    st = self._live_status.get(batch_id, {})
                    st["running"] = False
                    st["completed"] = final.total
                    st["success"] = final.success
                    st["failed"] = final.failed
                    st["status"] = "completed"
                    self._live_status[batch_id] = st
                self.store.finish_batch(batch_id, final, status="completed")
                self._schedule_event(batch_id, "batch_complete", {**st, "batch_id": batch_id})
                await batch_events.close_batch(batch_id)
            except asyncio.CancelledError:
                async with self._lock:
                    st = self._live_status.get(batch_id, {})
                    st["running"] = False
                    st["status"] = "cancelled"
                    self._live_status[batch_id] = st
                report = self._live_reports.get(batch_id, report)
                report.finished_at = datetime.utcnow()
                self.store.finish_batch(batch_id, report, status="cancelled")
                self._schedule_event(batch_id, "batch_cancelled", {**st, "batch_id": batch_id})
                await batch_events.close_batch(batch_id)
                logger.info("Batch {} cancelled", batch_id)
                raise
            except Exception as exc:
                logger.exception("Batch {} failed: {}", batch_id, exc)
                async with self._lock:
                    st = self._live_status.get(batch_id, {})
                    st["running"] = False
                    st["status"] = "failed"
                    self._live_status[batch_id] = st
                self.store.update_batch_progress(
                    batch_id,
                    completed=self._live_status[batch_id].get("completed", 0),
                    success=self._live_status[batch_id].get("success", 0),
                    failed=self._live_status[batch_id].get("failed", 0),
                    status="failed",
                )
                self._schedule_event(
                    batch_id,
                    "batch_failed",
                    {**self._live_status.get(batch_id, {}), "batch_id": batch_id, "error": str(exc)},
                )
                await batch_events.close_batch(batch_id)
            finally:
                async with self._lock:
                    self._tasks.pop(batch_id, None)

        task = asyncio.create_task(_run())
        async with self._lock:
            self._tasks[batch_id] = task

        return batch_id

    async def cancel_batch(self, batch_id: str) -> bool:
        async with self._lock:
            task = self._tasks.get(batch_id)
        if not task or task.done():
            batch = self.store.get_batch(batch_id)
            if batch and batch["status"] == "running":
                self.store.update_batch_progress(
                    batch_id,
                    completed=batch["completed"],
                    success=batch["success"],
                    failed=batch["failed"],
                    status="cancelled",
                )
            return False
        task.cancel()
        return True

    def get_batch_status(self, batch_id: str) -> dict[str, Any] | None:
        live = self._live_status.get(batch_id)
        if live:
            return {**live, "status": live.get("status", "running" if live.get("running") else "completed")}
        batch = self.store.get_batch(batch_id)
        if not batch:
            return None
        running = batch["status"] == "running"
        return {
            "started_at": datetime.fromisoformat(batch["started_at"]),
            "running": running,
            "completed": batch["completed"],
            "total": batch["total"],
            "success": batch["success"],
            "failed": batch["failed"],
            "status": batch["status"],
        }

    def get_batch_result(self, batch_id: str) -> BatchReport | dict | None:
        report = self._live_reports.get(batch_id)
        if report and not self._live_status.get(batch_id, {}).get("running"):
            return report
        stored = self.store.get_batch(batch_id)
        if stored:
            return stored
        return report

    async def scrape_single(
        self,
        url: str,
        *,
        use_ai: bool | None = None,
        save: bool = True,
        session_id: str | None = None,
    ) -> tuple[JobResult, int | None]:
        engine = ScrapeEngine(self.settings, max_workers=1)
        job = ScrapeJob(url=url, use_ai=use_ai, session_id=session_id)
        async with engine:
            result = await engine.run_job(job)
        product_id: int | None = None
        if save and result.product:
            product_id = self.store.save(result.product)
            self.store.export_json_file(result.product)
        return result, product_id

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
            product = self.store.get_by_id(product_id)
        elif url:
            product = self.store.get_by_url(url)
        if not product:
            raise ValueError("product not found")

        listing = to_export_listing(product, self.settings)
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


_manager: ScrapeManager | None = None


def get_manager() -> ScrapeManager:
    global _manager
    if _manager is None:
        _manager = ScrapeManager()
    return _manager
