"""Project flow run endpoints — start, stop, and poll pipeline execution."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException

from server.auth import require_panel_auth
from server.deps import protected_router
from server.projects.deps import require_project
from server.schemas.projects import (
    ProjectRunListResponse,
    ProjectRunRecord,
    ProjectRunRequest,
    ProjectRunResponse,
    ProjectStepResult,
)
from server.services.project_runner_service import get_project_runner_service

router = protected_router(prefix="/projects", tags=["project-run"])
ProjectRecord = Annotated[dict[str, Any], Depends(require_project)]


def _to_run_record(raw: dict[str, Any]) -> ProjectRunRecord:
    steps = [ProjectStepResult(**s) for s in raw.get("steps", [])]
    return ProjectRunRecord(
        id=raw["id"],
        project_id=raw["project_id"],
        status=raw.get("status", "pending"),
        trigger=raw.get("trigger", "manual"),
        triggered_by=raw.get("triggered_by", "system"),
        node_id=raw.get("node_id"),
        steps=steps,
        started_at=raw.get("started_at", ""),
        finished_at=raw.get("finished_at"),
        error=raw.get("error"),
    )


@router.post("/{project_id}/run", response_model=ProjectRunResponse)
async def start_project_run(
    project: ProjectRecord,
    body: ProjectRunRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectRunResponse:
    """Start a full flow run or execute a single node (non-blocking)."""
    runner = get_project_runner_service()
    run = runner.start_run(
        project,
        node_id=body.node_id or None,
        triggered_by=username,
        trigger="manual",
    )
    return ProjectRunResponse(
        run_id=run["id"],
        status=run["status"],
        project_id=run["project_id"],
        started_at=run["started_at"],
    )


@router.post("/{project_id}/runs/{run_id}/stop")
async def stop_project_run(
    project_id: str,
    run_id: str,
    _project: ProjectRecord,
    _username: str = Depends(require_panel_auth),
) -> dict[str, bool]:
    """Signal the running flow to stop after the current step."""
    ok = get_project_runner_service().stop_run(project_id, run_id)
    if not ok:
        raise HTTPException(status_code=404, detail="run not found")
    return {"ok": True}


@router.get("/{project_id}/runs", response_model=ProjectRunListResponse)
async def list_project_runs(
    project: ProjectRecord,
    limit: int = 20,
    offset: int = 0,
) -> ProjectRunListResponse:
    """List recent run records for a project (newest first)."""
    project_id: str = project["id"]
    runner = get_project_runner_service()
    items, total = runner.list_runs(project_id, limit=limit, offset=offset)
    return ProjectRunListResponse(
        items=[_to_run_record(r) for r in items],
        total=total,
    )


@router.get("/{project_id}/runs/{run_id}", response_model=ProjectRunRecord)
async def get_project_run(
    project_id: str,
    run_id: str,
    _project: ProjectRecord,
) -> ProjectRunRecord:
    """Poll a specific run for status and step results."""
    run = get_project_runner_service().get_run(project_id, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="run not found")
    return _to_run_record(run)
