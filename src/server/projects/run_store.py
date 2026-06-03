"""Per-project flow run records — stored as JSON under data/projects/_runs/."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from core.paths import data_dir

MAX_RUNS_PER_PROJECT = 100


def _runs_dir() -> Path:
    return data_dir() / "projects" / "_runs"


def _run_path(project_id: str) -> Path:
    safe = project_id.replace("/", "-").replace("..", "")
    return _runs_dir() / f"{safe}.json"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _read_runs(project_id: str) -> list[dict[str, Any]]:
    path = _run_path(project_id)
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return raw if isinstance(raw, list) else []


def _write_runs(project_id: str, runs: list[dict[str, Any]]) -> None:
    path = _run_path(project_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(runs[:MAX_RUNS_PER_PROJECT], indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def create_run(
    project_id: str,
    *,
    trigger: str = "manual",
    triggered_by: str = "system",
    node_id: str | None = None,
) -> dict[str, Any]:
    """Create a new run record in 'pending' status and persist it."""
    run: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "status": "pending",
        "trigger": trigger,
        "triggered_by": triggered_by,
        "node_id": node_id,
        "steps": [],
        "started_at": _now_iso(),
        "finished_at": None,
        "error": None,
    }
    runs = _read_runs(project_id)
    runs.insert(0, run)
    _write_runs(project_id, runs)
    return run


def update_run(project_id: str, run_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    """Patch top-level fields of a run record and persist."""
    runs = _read_runs(project_id)
    for run in runs:
        if run.get("id") == run_id:
            run.update(patch)
            _write_runs(project_id, runs)
            return run
    return None


def upsert_step(
    project_id: str,
    run_id: str,
    step: dict[str, Any],
) -> dict[str, Any] | None:
    """Insert or replace a step result within a run."""
    runs = _read_runs(project_id)
    for run in runs:
        if run.get("id") != run_id:
            continue
        steps: list[dict[str, Any]] = run.get("steps", [])
        for i, existing in enumerate(steps):
            if existing.get("node_id") == step.get("node_id") and existing.get("phase") == step.get(
                "phase"
            ):
                steps[i] = step
                break
        else:
            steps.append(step)
        run["steps"] = steps
        _write_runs(project_id, runs)
        return run
    return None


def get_run(project_id: str, run_id: str) -> dict[str, Any] | None:
    for run in _read_runs(project_id):
        if run.get("id") == run_id:
            return run
    return None


def list_runs(
    project_id: str,
    *,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    all_runs = _read_runs(project_id)
    total = len(all_runs)
    return all_runs[offset : offset + limit], total


def abort_stale_runs(project_id: str) -> None:
    """Mark any 'pending' or 'running' runs as 'stopped' (e.g. on server restart)."""
    runs = _read_runs(project_id)
    changed = False
    for run in runs:
        if run.get("status") in ("pending", "running"):
            run["status"] = "stopped"
            run["finished_at"] = _now_iso()
            run["error"] = "Run aborted (server restarted)"
            changed = True
    if changed:
        _write_runs(project_id, runs)
