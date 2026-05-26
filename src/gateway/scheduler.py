"""Background cron scheduler for gateway agent tasks."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from loguru import logger

from gateway.agent_runtime import GatewayAgent
from gateway.schedules_store import (
    append_run,
    compute_next_run,
    get_schedule,
    load_schedules,
    save_schedules,
    update_run,
    update_schedule_run_meta,
)
from server.manager import get_manager
from server.services.audit import log_cron


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


class AgentScheduler:
    """Minute-resolution cron loop for scheduled agent prompts."""

    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self._tick_seconds = 60

    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._running = True
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._loop())
            logger.info("Agent scheduler started (cron, {}s tick)", self._tick_seconds)
        except RuntimeError:
            pass

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def is_active(self) -> bool:
        return bool(self._running and self._task and not self._task.done())

    def get_status(self) -> dict[str, Any]:
        from gateway.schedules_store import SCHEDULES_PATH, ensure_schedules_file

        ensure_schedules_file()
        schedules = load_schedules()
        tasks = [
            {
                "id": str(s.get("id", "")),
                "name": str(s.get("name", "")),
                "enabled": bool(s.get("enabled", True)),
                "cron": str(s.get("cron", "")),
                "prompt_id": str(s.get("prompt_id", "")),
                "next_run_at": s.get("next_run_at"),
                "last_run_at": s.get("last_run_at"),
                "last_status": s.get("last_status"),
                "last_error": s.get("last_error"),
            }
            for s in schedules
        ]
        enabled = sum(1 for t in tasks if t["enabled"])
        failed = sum(1 for t in tasks if t.get("last_status") == "failed")
        return {
            "running": self.is_active(),
            "tick_seconds": self._tick_seconds,
            "schedules_path": str(SCHEDULES_PATH),
            "total": len(tasks),
            "enabled": enabled,
            "failed_last_run": failed,
            "tasks": tasks,
        }

    async def _loop(self) -> None:
        while self._running:
            try:
                await self._tick()
            except Exception as exc:
                logger.exception("Agent scheduler tick failed: {}", exc)
            await asyncio.sleep(self._tick_seconds)

    async def _tick(self) -> None:
        now = datetime.utcnow()
        schedules = load_schedules()
        changed = False
        for schedule in schedules:
            if not schedule.get("enabled", True):
                continue
            cron = schedule.get("cron")
            if not cron:
                continue
            if not schedule.get("next_run_at"):
                try:
                    schedule["next_run_at"] = compute_next_run(cron, now)
                    changed = True
                except Exception:
                    continue
            next_at = _parse_iso(schedule.get("next_run_at"))
            if not next_at or now < next_at:
                continue
            schedule_id = str(schedule.get("id", ""))
            logger.info("Running scheduled agent: {} ({})", schedule.get("name"), schedule_id)
            asyncio.create_task(self.run_schedule(schedule_id, trigger="cron"))
            try:
                schedule["next_run_at"] = compute_next_run(cron, now)
            except Exception:
                pass
            changed = True
        if changed:
            save_schedules(schedules)

    async def run_schedule(self, schedule_id: str, *, trigger: str = "manual") -> dict[str, Any]:
        schedule = get_schedule(schedule_id)
        if not schedule:
            return {"ok": False, "error": "schedule not found"}

        message = schedule.get("message") or "Run scheduled agent task."
        prompt_id = schedule.get("prompt_id") or "gateway_agent"
        run_entry = append_run(
            {
                "schedule_id": schedule_id,
                "schedule_name": schedule.get("name"),
                "trigger": trigger,
                "prompt_id": prompt_id,
                "message": message,
                "status": "running",
            }
        )
        run_id = run_entry["id"]

        mgr = get_manager()
        agent = GatewayAgent(mgr.settings)
        try:
            result = await agent.run(
                message,
                manager=mgr,
                prompt_id=prompt_id,
                max_tool_rounds=5,
            )
            status = "success" if result.get("ok") else "failed"
            update_schedule_run_meta(
                schedule_id,
                status=status,
                error=None if result.get("ok") else str(result.get("message")),
            )
            update_run(
                run_id,
                {
                    "status": status,
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                    "ok": result.get("ok"),
                    "response": result.get("message"),
                    "tool_calls": result.get("tool_calls") or [],
                    "model": result.get("model"),
                    "prompt_id": result.get("prompt_id"),
                },
            )
            log_cron(
                operation_type="Cron job" if trigger == "cron" else "Agent schedule",
                details=(
                    f"{schedule.get('name')}: {status} — "
                    f"{(result.get('message') or '')[:180]}"
                ),
                meta={"run_id": run_id, "schedule_id": schedule_id, "trigger": trigger},
            )
            return {"ok": result.get("ok", False), "run_id": run_id, **result}
        except Exception as exc:
            logger.exception("Scheduled agent failed: {}", exc)
            update_schedule_run_meta(schedule_id, status="failed", error=str(exc))
            update_run(
                run_id,
                {
                    "status": "failed",
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                    "ok": False,
                    "error": str(exc),
                },
            )
            log_cron(
                operation_type="Cron job" if trigger == "cron" else "Agent schedule",
                details=f"{schedule.get('name')}: failed — {exc}",
                meta={"run_id": run_id, "schedule_id": schedule_id, "trigger": trigger},
            )
            return {"ok": False, "run_id": run_id, "error": str(exc)}


_scheduler: AgentScheduler | None = None


def get_scheduler() -> AgentScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AgentScheduler()
    return _scheduler
