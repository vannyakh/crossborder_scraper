"""JSON file store for project flow graphs (one file per project)."""

from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from core.paths import data_dir
from server.projects.derive import apply_derived_fields, strip_derived_fields

_PROJECT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def projects_dir() -> Path:
    return data_dir() / "projects"


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


def ensure_projects_dir() -> Path:
    root = projects_dir()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _project_path(project_id: str) -> Path:
    if not _PROJECT_ID_RE.match(project_id):
        raise ValueError(f"invalid project id: {project_id}")
    return projects_dir() / f"{project_id}.json"


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def list_project_ids() -> list[str]:
    ensure_projects_dir()
    ids: list[str] = []
    for path in sorted(projects_dir().glob("*.json")):
        if path.name.startswith("."):
            continue
        ids.append(path.stem)
    return ids


def load_project(project_id: str) -> dict[str, Any] | None:
    raw = _read_json(_project_path(project_id))
    if not isinstance(raw, dict):
        return None
    return apply_derived_fields(raw)


def load_all_projects() -> list[dict[str, Any]]:
    return [p for pid in list_project_ids() if (p := load_project(pid)) is not None]


def save_project(record: dict[str, Any]) -> dict[str, Any]:
    project_id = str(record.get("id") or "")
    if not project_id:
        raise ValueError("project id is required")
    persisted = strip_derived_fields({**record, "updated_at": _now_iso()})
    _write_json(_project_path(project_id), persisted)
    return apply_derived_fields(persisted)


def delete_project(project_id: str) -> bool:
    path = _project_path(project_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "project"


def new_project_id(name: str) -> str:
    slug = slugify_name(name)
    suffix = uuid.uuid4().hex[:4]
    return f"{slug}-{suffix}"


def starter_flow_nodes() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Default schedule trigger → gateway agent main path for new projects."""
    schedule_id = f"node-schedule-{uuid.uuid4().hex[:8]}"
    agent_id = f"node-agent-{uuid.uuid4().hex[:8]}"
    schedule = {
        "id": schedule_id,
        "kind": "schedule",
        "role": "trigger",
        "label": "New schedule",
        "subtitle": "cron: 0 * * * *",
        "status": "online",
        "x": 120,
        "y": 160,
    }
    agent = {
        "id": agent_id,
        "kind": "agent",
        "role": "agent",
        "label": "Gateway agent",
        "subtitle": "Tools agent",
        "host": "gateway-tools",
        "status": "online",
        "x": 360,
        "y": 160,
    }
    edges = [
        {
            "id": f"e-{schedule_id}-{agent_id}",
            "from": schedule_id,
            "to": agent_id,
            "kind": "main",
        }
    ]
    return [schedule, agent], edges
