"""Persist agent cron schedules and run history."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

MAX_RUN_HISTORY = 100


def schedules_path() -> Path:
    from core.paths import config_dir

    return config_dir() / "agent_schedules.json"


def agent_runs_path() -> Path:
    from core.paths import data_dir

    return data_dir() / "agent_runs.json"


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
    path = schedules_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        example = path.with_name("agent_schedules.example.json")
        if example.exists():
            path.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            _write_json(path, {"schedules": []})
    return path


def load_schedules() -> list[dict[str, Any]]:
    ensure_schedules_file()
    raw = _read_json(schedules_path()) or {}
    schedules = raw.get("schedules") if isinstance(raw, dict) else raw
    if not isinstance(schedules, list):
        return []
    return schedules


def save_schedules(schedules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    _write_json(schedules_path(), {"schedules": schedules})
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
    raw = _read_json(agent_runs_path())
    if not isinstance(raw, list):
        return []
    return raw[:limit]


def append_run(entry: dict[str, Any]) -> dict[str, Any]:
    path = agent_runs_path()
    runs = _read_json(path)
    if not isinstance(runs, list):
        runs = []
    entry.setdefault("id", str(uuid.uuid4()))
    entry.setdefault("started_at", datetime.utcnow().isoformat() + "Z")
    runs.insert(0, entry)
    _write_json(path, runs[:MAX_RUN_HISTORY])
    return entry


def update_run(run_id: str, patch: dict[str, Any]) -> None:
    path = agent_runs_path()
    runs = _read_json(path)
    if not isinstance(runs, list):
        return
    for r in runs:
        if r.get("id") == run_id:
            r.update(patch)
            break
    _write_json(path, runs)


def compute_next_run(cron: str, base: datetime | None = None) -> str:
    from zoneinfo import ZoneInfo

    from croniter import croniter

    from core.timezone import get_panel_timezone

    tz = get_panel_timezone()
    if base is None:
        cron_base = datetime.now(tz)
    elif base.tzinfo is None:
        cron_base = base.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
    else:
        cron_base = base.astimezone(tz)

    nxt = croniter(cron, cron_base).get_next(datetime)
    if nxt.tzinfo is None:
        nxt = nxt.replace(tzinfo=tz)
    utc = nxt.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    return utc.isoformat() + "Z"


def recalculate_schedule_next_runs() -> int:
    """Recompute ``next_run_at`` for all schedules after timezone change."""
    schedules = load_schedules()
    changed = 0
    for schedule in schedules:
        cron = schedule.get("cron")
        if not cron:
            continue
        try:
            schedule["next_run_at"] = compute_next_run(str(cron))
            changed += 1
        except Exception:
            continue
    if changed:
        save_schedules(schedules)
    return changed


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
