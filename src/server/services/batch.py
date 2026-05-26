"""Concurrent batch scrape jobs with live status and SSE events."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from loguru import logger

from core.engine import BatchReport, JobResult, ScrapeEngine, ScrapeJob
from core.engine.jobs import JobStatus
from server.core.events import batch_events
from server.services.audit import log_run
from server.services.context import AppContext, get_context

_batch: BatchService | None = None


class BatchService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()
        self._lock = asyncio.Lock()
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._live_status: dict[str, dict[str, Any]] = {}
        self._live_reports: dict[str, BatchReport] = {}

    @property
    def active_task_count(self) -> int:
        return len(self._tasks)

    def running_batches_snapshot(self) -> list[dict[str, Any]]:
        return [
            {
                "batch_id": batch_id,
                "status": st.get("status", "running"),
                "completed": st.get("completed", 0),
                "total": st.get("total", 0),
                "success": st.get("success", 0),
                "failed": st.get("failed", 0),
                "running": bool(st.get("running")),
            }
            for batch_id, st in self._live_status.items()
        ]

    def running_batch_count(self) -> int:
        return sum(1 for st in self._live_status.values() if st.get("running"))

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
        engine = ScrapeEngine(self._ctx.settings, max_workers=workers)
        jobs = [ScrapeJob(url=u, use_ai=use_ai, session_id=session_id) for u in urls]
        report = BatchReport(total=len(jobs))
        batch_id = report.batch_id
        batch_user = submitted_by or "system"

        async with self._lock:
            self._ctx.store.create_batch(
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
            log_run(
                user=batch_user,
                operation_type="Scrape batch",
                details=(
                    f"Batch {batch_id} started ({len(jobs)} jobs, "
                    f"workers={workers or self._ctx.settings.max_concurrent_jobs})"
                ),
                meta={"batch_id": batch_id},
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
                live_report = self._live_reports.get(batch_id)
                if live_report is not None:
                    live_report.results.append(result)
                    live_report.success = st["success"]
                    live_report.failed = st["failed"]
                self._ctx.store.update_batch_progress(
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
                self._ctx.store.finish_batch(batch_id, final, status="completed")
                log_run(
                    user=batch_user,
                    operation_type="Scrape batch",
                    details=(
                        f"Batch {batch_id} completed: {final.success}/{final.total} success, "
                        f"{final.failed} failed"
                    ),
                    meta={"batch_id": batch_id, "status": "completed"},
                )
                self._schedule_event(batch_id, "batch_complete", {**st, "batch_id": batch_id})
                await batch_events.close_batch(batch_id)
            except asyncio.CancelledError:
                async with self._lock:
                    st = self._live_status.get(batch_id, {})
                    st["running"] = False
                    st["status"] = "cancelled"
                    self._live_status[batch_id] = st
                live_report = self._live_reports.get(batch_id, report)
                live_report.finished_at = datetime.utcnow()
                self._ctx.store.finish_batch(batch_id, live_report, status="cancelled")
                log_run(
                    user=batch_user,
                    operation_type="Scrape batch",
                    details=f"Batch {batch_id} cancelled",
                    meta={"batch_id": batch_id, "status": "cancelled"},
                )
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
                self._ctx.store.update_batch_progress(
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
            batch = self._ctx.store.get_batch(batch_id)
            if batch and batch["status"] == "running":
                self._ctx.store.update_batch_progress(
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
        batch = self._ctx.store.get_batch(batch_id)
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
        stored = self._ctx.store.get_batch(batch_id)
        if stored:
            return stored
        return report


def get_batch_service() -> BatchService:
    global _batch
    if _batch is None:
        _batch = BatchService()
    return _batch
