"""Gateway control plane — agent, schedules, workflows, and tool catalog."""

from __future__ import annotations

from typing import Any

from gateway.agent_runtime import GatewayAgent
from gateway.prompts import list_prompts
from gateway.schedules_store import (
    compute_next_run,
    delete_schedule,
    ensure_schedules_file,
    get_schedule,
    load_runs,
    load_schedules,
    upsert_schedule,
)
from gateway.tools import TOOL_DEFINITIONS
from gateway.workflows import WORKFLOW_TEMPLATES, run_workflow
from server.core.constants import APP_VERSION
from server.services.runtime import get_service_runtime


class GatewayService:
    def get_status(self) -> dict[str, Any]:
        runtime = get_service_runtime()
        schedules = load_schedules() if _schedules_ready() else []
        enabled_schedules = sum(1 for s in schedules if s.get("enabled"))
        recent_runs = load_runs(limit=5) if _schedules_ready() else []
        failed_runs = sum(1 for r in recent_runs if r.get("ok") is False)
        return {
            "service": "crossborder-scraper-gateway",
            "version": APP_VERSION,
            "control_plane": "fastapi",
            "clients": ["web-ui", "cli", "agent", "cron"],
            "tools_count": len(TOOL_DEFINITIONS),
            "workflows_count": len(WORKFLOW_TEMPLATES),
            "schedules_count": len(schedules),
            "enabled_schedules_count": enabled_schedules,
            "recent_failed_runs": failed_runs,
            "runtime": runtime,
        }

    def list_tools(self) -> list[dict[str, Any]]:
        return TOOL_DEFINITIONS

    def list_prompts(self) -> list[dict[str, Any]]:
        return list_prompts()  # type: ignore[return-value]

    def list_workflows(self) -> list[dict[str, Any]]:
        return [
            {
                "id": wf_id,
                "label": meta["label"],
                "description": meta["description"],
                "inputs": meta.get("inputs") or [],
                "steps": [s["tool"] for s in meta.get("steps") or []],
            }
            for wf_id, meta in WORKFLOW_TEMPLATES.items()
        ]

    async def run_agent(self, message: str, *, prompt_id: str | None = None) -> dict[str, Any]:
        from server.manager import get_manager

        mgr = get_manager()
        agent = GatewayAgent(mgr.settings)
        return await agent.run(message.strip(), manager=mgr, prompt_id=prompt_id)

    async def run_workflow(self, workflow_id: str, *, inputs: dict[str, Any]) -> dict[str, Any]:
        from server.manager import get_manager

        if workflow_id not in WORKFLOW_TEMPLATES:
            raise ValueError(f"unknown workflow: {workflow_id}")
        return await run_workflow(workflow_id, inputs=inputs, manager=get_manager())

    def list_schedules(self) -> list[dict[str, Any]]:
        ensure_schedules_file()
        return load_schedules()

    def create_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        compute_next_run(payload["cron"])
        return upsert_schedule(payload)

    def update_schedule(self, schedule_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        existing = get_schedule(schedule_id)
        if not existing:
            raise LookupError("schedule not found")
        if "cron" in patch:
            patch["next_run_at"] = compute_next_run(patch["cron"])
        return upsert_schedule({**existing, **patch, "id": schedule_id})

    def delete_schedule(self, schedule_id: str) -> bool:
        return delete_schedule(schedule_id)

    async def run_schedule_now(self, schedule_id: str) -> dict[str, Any]:
        from gateway.scheduler import get_scheduler

        return await get_scheduler().run_schedule(schedule_id, trigger="manual")

    def list_runs(self, *, limit: int = 30) -> list[dict[str, Any]]:
        return load_runs(limit=limit)


def _schedules_ready() -> bool:
    try:
        ensure_schedules_file()
        return True
    except Exception:
        return False


_gateway_service: GatewayService | None = None


def get_gateway_service() -> GatewayService:
    global _gateway_service
    if _gateway_service is None:
        _gateway_service = GatewayService()
    return _gateway_service
