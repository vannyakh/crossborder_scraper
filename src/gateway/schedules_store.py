"""Persist agent cron schedules and run history."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

SCHEDULES_PATH = Path("config/agent_schedules.json")
RUNS_PATH = Path("data/agent_runs.json")
MAX_RUN_HISTORY = 100


def _read_json(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def ensure_schedules_file() -> Path:
    SCHEDULES_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not SCHEDULES_PATH.exists():
        example = SCHEDULES_PATH.with_name("agent_schedules.example.json")
        if example.exists():
            SCHEDULES_PATH.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            _write_json(SCHEDULES_PATH, {"schedules": []})
    return SCHEDULES_PATH


def load_schedules() -> list[dict[str, Any]]:
    ensure_schedules_file()
    raw = _read_json(SCHEDULES_PATH) or {}
    schedules = raw.get("schedules") if isinstance(raw, dict) else raw
    if not isinstance(schedules, list):
        return []
    return schedules


def save_schedules(schedules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    _write_json(SCHEDULES_PATH, {"schedules": schedules})
    return schedules


def get_schedule(schedule_id: str) -> dict[str, Any] | None:
    for s in load_schedules():
        if s.get("id") == schedule_id:
            return s
    return None


def upsert_schedule(data: dict[str, Any]) -> dict[str, Any]:
    schedules = load_schedules()
    sid = data.get("id") or str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    record = {**data, "id": sid, "updated_at": now}
    if not data.get("id"):
        record["created_at"] = now
    found = False
    out: list[dict[str, Any]] = []
    for s in schedules:
        if s.get("id") == sid:
            out.append({**s, **record})
            found = True
        else:
            out.append(s)
    if not found:
        record.setdefault("created_at", now)
        out.append(record)
    if record.get("cron") and not record.get("next_run_at"):
        try:
            record["next_run_at"] = compute_next_run(str(record["cron"]))
        except Exception:
            pass
    save_schedules(out)
    return record


def delete_schedule(schedule_id: str) -> bool:
    schedules = load_schedules()
    filtered = [s for s in schedules if s.get("id") != schedule_id]
    if len(filtered) == len(schedules):
        return False
    save_schedules(filtered)
    return True


def load_runs(limit: int = 50) -> list[dict[str, Any]]:
    raw = _read_json(RUNS_PATH)
    if not isinstance(raw, list):
        return []
    return raw[:limit]


def append_run(entry: dict[str, Any]) -> dict[str, Any]:
    runs = _read_json(RUNS_PATH)
    if not isinstance(runs, list):
        runs = []
    entry.setdefault("id", str(uuid.uuid4()))
    entry.setdefault("started_at", datetime.utcnow().isoformat() + "Z")
    runs.insert(0, entry)
    _write_json(RUNS_PATH, runs[:MAX_RUN_HISTORY])
    return entry


def update_run(run_id: str, patch: dict[str, Any]) -> None:
    runs = _read_json(RUNS_PATH)
    if not isinstance(runs, list):
        return
    for r in runs:
        if r.get("id") == run_id:
            r.update(patch)
            break
    _write_json(RUNS_PATH, runs)


def compute_next_run(cron: str, base: datetime | None = None) -> str:
    from croniter import croniter

    base = base or datetime.utcnow()
    return croniter(cron, base).get_next(datetime).isoformat() + "Z"


def update_schedule_run_meta(schedule_id: str, *, status: str, error: str | None = None) -> None:
    schedules = load_schedules()
    now = datetime.utcnow().isoformat() + "Z"
    changed = False
    for s in schedules:
        if s.get("id") == schedule_id:
            s["last_run_at"] = now
            s["last_status"] = status
            s["last_error"] = error
            changed = True
            break
    if changed:
        save_schedules(schedules)
