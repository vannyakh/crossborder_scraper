"""Project flow CRUD, canvas persistence, and live presence."""

from typing import Annotated, Any

from fastapi import Depends, HTTPException

from server.auth import require_panel_auth
from server.deps import protected_router
from server.projects.collaboration import get_project_collaboration_hub
from server.projects.deps import require_project
from server.schemas.projects import (
    ProjectCreateRequest,
    ProjectDetail,
    ProjectFlowUpdateRequest,
    ProjectListResponse,
    ProjectPresenceResponse,
    ProjectSummary,
    ProjectUpdateRequest,
)
from server.services.audit import log_operation, log_project_runtime
from server.services.project_service import get_project_service

router = protected_router(prefix="/projects", tags=["projects"])
ProjectRecord = Annotated[dict[str, Any], Depends(require_project)]


@router.get("", response_model=ProjectListResponse)
async def list_projects() -> ProjectListResponse:
    items = get_project_service().list_projects()
    return ProjectListResponse(
        items=[ProjectSummary(**i) for i in items],
        total=len(items),
    )


@router.get("/presence", response_model=ProjectPresenceResponse)
async def project_presence() -> ProjectPresenceResponse:
    """Live canvas guests per project (from collaboration WebSocket rooms)."""
    from server.schemas.projects import ProjectPresenceGuest, ProjectPresenceItem

    hub = get_project_collaboration_hub()
    items = [
        ProjectPresenceItem(
            project_id=str(row["project_id"]),
            guests=[ProjectPresenceGuest(**guest) for guest in row["guests"]],
        )
        for row in await hub.presence_items_merged()
    ]
    return ProjectPresenceResponse(items=items)


@router.post("", response_model=ProjectDetail)
async def create_project(
    body: ProjectCreateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    created = get_project_service().create_project(body)
    log_operation(
        user=username,
        operation_type="Project",
        details=f"Create {created['id']} ({created['name']})",
        meta={"project_id": created["id"]},
    )
    log_project_runtime(
        created["id"],
        user=username,
        message=f"Project created · {created['name']}",
        level="success",
    )
    return ProjectDetail(**created)


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project: ProjectRecord) -> ProjectDetail:
    return ProjectDetail(**project)


@router.patch("/{project_id}", response_model=ProjectDetail)
async def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    svc = get_project_service()
    try:
        updated = svc.update_project(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    log_operation(
        user=username,
        operation_type="Project",
        details=f"Update metadata {project_id}",
        meta={"project_id": project_id},
    )
    log_project_runtime(
        project_id,
        user=username,
        message="Project metadata updated",
        level="info",
    )
    return ProjectDetail(**updated)


@router.put("/{project_id}/flow", response_model=ProjectDetail)
async def update_project_flow(
    project_id: str,
    body: ProjectFlowUpdateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    svc = get_project_service()
    try:
        updated = svc.update_flow(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    node_count = len(body.nodes)
    edge_count = len(body.edges)
    log_operation(
        user=username,
        operation_type="Project flow",
        details=f"Save {project_id}",
        meta={"project_id": project_id},
    )
    log_project_runtime(
        project_id,
        user=username,
        message=f"Flow canvas saved — {node_count} nodes, {edge_count} edges",
        level="info",
    )
    await get_project_collaboration_hub().notify_flow_updated(
        project_id,
        updated,
        source_client_id=body.client_id,
    )
    return ProjectDetail(**updated)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    username: str = Depends(require_panel_auth),
) -> dict[str, bool]:
    ok = get_project_service().delete_project(project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="project not found")
    log_operation(
        user=username,
        operation_type="Project",
        details=f"Delete {project_id}",
        meta={"project_id": project_id},
    )
    return {"ok": True}
