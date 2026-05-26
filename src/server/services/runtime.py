"""Runtime snapshot and service statistics."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from core.proxy import ProxyPool
from server.core.constants import APP_VERSION, SERVICE_STARTED_AT
from server.services.batch import get_batch_service
from server.services.config import get_config_service
from server.services.context import get_context


def get_stats() -> dict[str, Any]:
    ctx = get_context()
    batch = get_batch_service()
    sessions: dict[str, list[str]] = {}
    for site in ("1688", "taobao", "aliexpress"):
        found = ctx.cookies.list_sessions(site)
        if found:
            sessions[site] = found
    return {
        "products": ctx.store.count_products(),
        "batches": ctx.store.count_batches(),
        "output_files": len(ctx.store.list_output_files()),
        "running_batches": batch.running_batch_count(),
        "cookies_sessions": sessions,
    }


def build_runtime_status(*, started_at: datetime | None = None) -> dict[str, Any]:
    ctx = get_context()
    batch = get_batch_service()
    config = get_config_service()
    started = started_at or SERVICE_STARTED_AT
    s = ctx.settings
    proxy_pool = ProxyPool.from_settings(s.proxy_server, s.proxy_list_path)
    uptime = (datetime.utcnow() - started).total_seconds()
    stats = get_stats()
    return {
        "service": "crossborder-scraper",
        "version": APP_VERSION,
        "started_at": started,
        "uptime_seconds": round(uptime, 1),
        "running_batches": batch.running_batches_snapshot(),
        "active_tasks": batch.active_task_count,
        "ai": config.get_ai_config(),
        "engine": {
            "max_concurrent_jobs": s.max_concurrent_jobs,
            "headless": s.headless,
            "proxy_count": proxy_pool.size,
            "browser_mode": "on_demand",
        },
        "storage": {
            "products": stats["products"],
            "batches": stats["batches"],
            "output_files": stats["output_files"],
            "db_path": str(s.db_path),
            "output_dir": str(s.output_dir),
        },
        "cookies_sessions": stats["cookies_sessions"],
    }


def get_service_runtime() -> dict[str, Any]:
    return build_runtime_status(started_at=SERVICE_STARTED_AT)
