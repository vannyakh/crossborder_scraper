"""Per-project flow runtime logs — flow saves, node runs, and deployment events."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from core.paths import data_dir

RuntimeLogLevel = Literal["info", "warn", "error", "debug", "success"]

MAX_RUNTIME_LOGS = 1000


def runtime_logs_dir() -> Path:
    return data_dir() / "projects" / "_runtime_logs"


def _log_path(project_id: str) -> Path:
    safe = project_id.replace("/", "-").replace("..", "")
    return runtime_logs_dir() / f"{safe}.json"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _read_logs(project_id: str) -> list[dict[str, Any]]:
    path = _log_path(project_id)
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return raw if isinstance(raw, list) else []


def _write_logs(project_id: str, entries: list[dict[str, Any]]) -> None:
    path = _log_path(project_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(entries[:MAX_RUNTIME_LOGS], indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def append_project_runtime_log(
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
    entry = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "level": level,
        "message": message,
        "user": user or "system",
        "node_id": node_id,
        "node_label": node_label,
        "run_id": run_id,
        "created_at": _now_iso(),
        "meta": meta or {},
    }
    logs = _read_logs(project_id)
    logs.insert(0, entry)
    _write_logs(project_id, logs)
    return entry


def list_project_runtime_logs(
    project_id: str,
    *,
    q: str = "",
    since: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    logs = _read_logs(project_id)

    since_ms: int | None = None
    if since:
        try:
            since_ms = int(datetime.fromisoformat(since.replace("Z", "+00:00")).timestamp() * 1000)
        except ValueError:
            since_ms = None

    needle = q.strip().lower()
    filtered: list[dict[str, Any]] = []
    for entry in logs:
        if since_ms is not None:
            try:
                at_ms = int(
                    datetime.fromisoformat(
                        str(entry.get("created_at", "")).replace("Z", "+00:00")
                    ).timestamp()
                    * 1000
                )
            except ValueError:
                at_ms = 0
            if at_ms < since_ms:
                continue
        if needle:
            haystack = " ".join(
                str(entry.get(key) or "")
                for key in ("message", "node_label", "node_id", "user", "level", "run_id")
            ).lower()
            if needle not in haystack:
                continue
        filtered.append(entry)

    total = len(filtered)
    page = filtered[offset : offset + limit]
    return page, total


def runtime_log_to_service_entry(entry: dict[str, Any]) -> dict[str, Any]:
    """Map a runtime log row to the shared ServiceLogEntry shape for the panel."""
    node_label = entry.get("node_label")
    service = str(node_label or entry.get("node_id") or "workflow")
    return {
        "id": str(entry.get("id") or ""),
        "category": "runtime",
        "user": str(entry.get("user") or "system"),
        "operation_type": service,
        "details": str(entry.get("message") or ""),
        "created_at": str(entry.get("created_at") or _now_iso()),
        "meta": {
            **(entry.get("meta") or {}),
            "level": entry.get("level") or "info",
            "node_id": entry.get("node_id"),
            "node_label": entry.get("node_label"),
            "run_id": entry.get("run_id"),
            "project_id": entry.get("project_id"),
        },
    }


def delete_project_runtime_logs(project_id: str) -> bool:
    path = _log_path(project_id)
    if not path.exists():
        return False
    path.unlink()
    return True
