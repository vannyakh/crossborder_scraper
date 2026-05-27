"""Panel support console — diagnostics, scheduler, and quick links for the UI."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from config import get_settings
from core.paths import layout_summary
from gateway.schedules_store import agent_runs_path, schedules_path
from server.audit.service_logs import count_service_logs, ensure_logs_file, logs_file_path
from server.core.panel_bind import get_panel_bind_info
from server.services.gateway_service import get_gateway_service
from server.services.runtime import get_service_runtime, get_stats


def _support_links() -> list[dict[str, Any]]:
    return [
        {
            "id": "logs",
            "label": "Operation logs",
            "description": "Scrape runs, cron jobs, and panel events",
            "path": "/logs",
            "external": False,
        },
        {
            "id": "health",
            "label": "Health",
            "description": "Engine, gateway agent, and LLM probe",
            "path": "/health",
            "external": False,
        },
        {
            "id": "workflow",
            "label": "Batch queue",
            "description": "Submit scrape URLs and monitor jobs",
            "path": "/workflow/batches",
            "external": False,
        },
        {
            "id": "schedules",
            "label": "Cron schedules",
            "description": "Add and run server cron agent tasks",
            "path": "/agent/schedules",
            "external": False,
        },
        {
            "id": "artifact",
            "label": "Artifacts",
            "description": "Product catalog and export files",
            "path": "/artifact/products",
            "external": False,
        },
        {
            "id": "settings",
            "label": "Configuration",
            "description": "AI, scrape engine, proxy, and marketplaces",
            "path": "/settings/ai",
            "external": False,
        },
        {
            "id": "network",
            "label": "Network & firewall",
            "description": "Panel port, ufw, and cloud security group",
            "path": "/settings/network",
            "external": False,
        },
    ]


def _readiness_checks(runtime: dict[str, Any], stats: dict[str, Any]) -> list[dict[str, Any]]:
    from gateway.scheduler import get_scheduler

    storage = runtime.get("storage") or {}
    ai = runtime.get("ai") or {}
    db_path = Path(str(storage.get("db_path", "")))
    output_dir = Path(str(storage.get("output_dir", "")))
    engine = runtime.get("engine") or {}
    max_jobs = int(engine.get("max_concurrent_jobs") or 1)
    active = int(runtime.get("active_tasks") or 0)
    cookies = stats.get("cookies_sessions") or {}
    cookie_count = sum(len(v) for v in cookies.values())

    return [
        {
            "id": "scheduler",
            "label": "Cron scheduler",
            "ok": get_scheduler().is_active(),
            "detail": "Gateway agent cron loop (1-minute tick)",
        },
        {
            "id": "database",
            "label": "Catalog database",
            "ok": db_path.is_file(),
            "detail": str(storage.get("db_path", "")),
        },
        {
            "id": "output",
            "label": "Output directory",
            "ok": output_dir.is_dir(),
            "detail": str(storage.get("output_dir", "")),
        },
        {
            "id": "capacity",
            "label": "Scrape capacity",
            "ok": active < max_jobs,
            "detail": f"{active}/{max_jobs} active workers",
        },
        {
            "id": "cookies",
            "label": "Site sessions",
            "ok": cookie_count > 0,
            "detail": f"{cookie_count} saved session(s)" if cookie_count else "No cookie sessions",
        },
        {
            "id": "ai",
            "label": "AI extraction",
            "ok": not ai.get("ai_enabled") or bool(ai.get("llm_ready")),
            "detail": "Disabled"
            if not ai.get("ai_enabled")
            else ("Configured" if ai.get("llm_ready") else "Enabled but LLM not ready"),
        },
    ]


def _network_readiness_checks() -> list[dict[str, Any]]:
    from deploy.network_access import build_network_access_status

    try:
        report = build_network_access_status(port=get_settings().panel_port)
    except Exception:
        return []
    out: list[dict[str, Any]] = []
    for check in report.get("checks", []):
        if check.get("id") == "cloud_sg":
            continue
        out.append(
            {
                "id": f"network_{check['id']}",
                "label": check["label"],
                "ok": check.get("ok"),
                "detail": check.get("detail", ""),
            }
        )
    return out


async def get_service_support() -> dict[str, Any]:
    from gateway.scheduler import get_scheduler

    runtime = get_service_runtime()
    stats = get_stats()
    gateway = get_gateway_service().get_status()
    scheduler = get_scheduler().get_status()
    settings = get_settings()
    ensure_logs_file()

    return {
        "runtime": runtime,
        "gateway": {
            "service": gateway["service"],
            "version": gateway["version"],
            "update_available": gateway.get("update_available", False),
            "latest_version": gateway.get("latest_version"),
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
        "scheduler": scheduler,
        "stats": stats,
        "logs": {
            **count_service_logs(),
            "path": str(logs_file_path()),
        },
        "paths": {
            **layout_summary(),
            "schedules": str(schedules_path()),
            "agent_runs": str(agent_runs_path()),
            "service_logs": str(logs_file_path()),
            "db": str(settings.db_path),
            "output": str(settings.output_dir),
            "cookies": str(settings.cookies_dir),
        },
        "panel": get_panel_bind_info(),
        "checks": _readiness_checks(runtime, stats) + _network_readiness_checks(),
        "links": _support_links(),
        "network": _safe_network_status(settings.panel_port),
    }


def _safe_network_status(port: int) -> dict[str, Any] | None:
    try:
        from deploy.network_access import build_network_access_status

        return build_network_access_status(port=port)
    except Exception:
        return None


def get_service_scheduler() -> dict[str, Any]:
    from gateway.scheduler import get_scheduler

    return get_scheduler().get_status()
