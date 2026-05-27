"""Persistent service logs for operation, run, and cron events."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

LogCategory = Literal["operation", "run", "cron"]

MAX_LOGS = 500


def logs_file_path() -> Path:
    from core.paths import logs_dir

    return logs_dir() / "service_logs.jsonl"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _read_logs() -> list[dict[str, Any]]:
    path = logs_file_path()
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return raw if isinstance(raw, list) else []


def _write_logs(entries: list[dict[str, Any]]) -> None:
    path = logs_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(entries[:MAX_LOGS], indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def ensure_logs_file() -> Path:
    path = logs_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        _write_logs([])
    return path


def append_service_log(
    category: LogCategory,
    *,
    user: str,
    operation_type: str,
    details: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_logs_file()
    entry = {
        "id": str(uuid.uuid4()),
        "category": category,
        "user": user or "system",
        "operation_type": operation_type,
        "details": details,
        "created_at": _now_iso(),
        "meta": meta or {},
    }
    logs = _read_logs()
    logs.insert(0, entry)
    _write_logs(logs)
    return entry


def count_service_logs() -> dict[str, int]:
    ensure_logs_file()
    counts = {"operation": 0, "run": 0, "cron": 0}
    for entry in _read_logs():
        cat = entry.get("category")
        if cat in counts:
            counts[cat] += 1
    counts["total"] = sum(counts.values())
    return counts


def list_service_logs(
    category: LogCategory,
    *,
    q: str = "",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    ensure_logs_file()
    needle = q.strip().lower()
    filtered = [e for e in _read_logs() if e.get("category") == category]
    if needle:
        filtered = [
            e
            for e in filtered
            if needle in str(e.get("user", "")).lower()
            or needle in str(e.get("operation_type", "")).lower()
            or needle in str(e.get("details", "")).lower()
        ]
    total = len(filtered)
    page = filtered[offset : offset + limit]
    return page, total


def clear_service_logs(category: LogCategory) -> int:
    ensure_logs_file()
    logs = _read_logs()
    kept = [e for e in logs if e.get("category") != category]
    removed = len(logs) - len(kept)
    _write_logs(kept)
    return removed


def import_agent_runs_to_cron_logs() -> int:
    """Import existing agent run history into cron logs."""
    from gateway.schedules_store import load_runs

    existing = {
        (e.get("meta") or {}).get("run_id")
        for e in _read_logs()
        if e.get("category") == "cron"
    }
    added = 0
    for run in load_runs(100):
        run_id = run.get("id")
        if run_id in existing:
            continue
        trigger = run.get("trigger") or "cron"
        name = run.get("schedule_name") or run.get("schedule_id") or "Agent schedule"
        status = run.get("status") or "unknown"
        detail = run.get("response") or run.get("error") or run.get("message") or ""
        append_service_log(
            "cron",
            user="system",
            operation_type="Cron job" if trigger == "cron" else "Agent run",
            details=f"{name}: {status}" + (f" — {detail[:200]}" if detail else ""),
            meta={"run_id": run_id, "schedule_id": run.get("schedule_id"), "imported": True},
        )
        added += 1
    return added
