"""Aggregated service console snapshot for the web UI."""

from __future__ import annotations

from typing import Any

from config import get_settings
from core.ai.health import check_llm_health
from server.services.gateway_service import get_gateway_service
from server.services.runtime import get_service_runtime


async def get_service_overview() -> dict[str, Any]:
    runtime = get_service_runtime()
    gateway_svc = get_gateway_service()
    gateway = gateway_svc.get_status()
    ai = runtime.get("ai") or {}
    llm: dict[str, Any] | None = None
    if ai.get("ai_enabled"):
        llm = await check_llm_health(get_settings())

    return {
        "runtime": runtime,
        "gateway": {
            "service": gateway["service"],
            "version": gateway["version"],
            "control_plane": gateway["control_plane"],
            "clients": gateway["clients"],
            "tools_count": gateway["tools_count"],
            "skills_count": gateway.get("skills_count", 0),
            "enabled_skills_count": gateway.get("enabled_skills_count", 0),
            "workflows_count": gateway["workflows_count"],
            "schedules_count": gateway["schedules_count"],
            "enabled_schedules_count": gateway["enabled_schedules_count"],
            "recent_failed_runs": gateway["recent_failed_runs"],
        },
        "llm": llm,
    }
