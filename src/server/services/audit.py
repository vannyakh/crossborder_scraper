"""Audit trail helpers — thin facade over the service log store."""

from __future__ import annotations

from typing import Any

from server.audit.service_logs import LogCategory, append_service_log
from server.projects.runtime_log_store import RuntimeLogLevel, append_project_runtime_log


def log_operation(
    *,
    user: str,
    operation_type: str,
    details: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return append_service_log(
        "operation",
        user=user,
        operation_type=operation_type,
        details=details,
        meta=meta,
    )


def log_run(
    *,
    user: str,
    operation_type: str,
    details: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return append_service_log(
        "run",
        user=user,
        operation_type=operation_type,
        details=details,
        meta=meta,
    )


def log_cron(
    *,
    user: str = "system",
    operation_type: str,
    details: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return append_service_log(
        "cron",
        user=user,
        operation_type=operation_type,
        details=details,
        meta=meta,
    )


def log_project_runtime(
    project_id: str,
    *,
    message: str,
    level: RuntimeLogLevel = "info",
    user: str = "system",
    node_id: str | None = None,
    node_label: str | None = None,
    run_id: str | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return append_project_runtime_log(
        project_id,
        message=message,
        level=level,
        user=user,
        node_id=node_id,
        node_label=node_label,
        run_id=run_id,
        meta=meta,
    )


__all__ = ["LogCategory", "log_cron", "log_operation", "log_project_runtime", "log_run"]
