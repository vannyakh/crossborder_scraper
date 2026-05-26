"""Audit trail helpers — thin facade over the service log store."""

from __future__ import annotations

from typing import Any

from server.stores.service_logs import LogCategory, append_service_log


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


__all__ = ["LogCategory", "log_cron", "log_operation", "log_run"]
