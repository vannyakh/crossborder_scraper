import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect

from server.auth import authenticate_websocket, require_panel_auth
from server.core.events import ws_message
from server.deps import protected_router
from server.projects.collaboration import get_project_collaboration_hub
from server.schemas import ServiceLogListResponse
from server.schemas.plugin_profiles import PluginProfileCatalogResponse
from server.schemas.projects import (
    ProjectCreateRequest,
    ProjectDetail,
    ProjectFlowUpdateRequest,
    ProjectListResponse,
    ProjectPresenceResponse,
    ProjectSummary,
    ProjectUpdateRequest,
)
from server.services.audit import log_operation
from server.services.project_flow_service import get_project_flow_service

router = protected_router(prefix="/projects", tags=["projects"])
ws_router = APIRouter(prefix="/projects", tags=["projects"])

ProjectLogCategory = Literal["operation", "run", "cron"]


@router.get("", response_model=ProjectListResponse)
async def list_projects() -> ProjectListResponse:
    items = get_project_flow_service().list_projects()
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
        for row in hub.presence_items()
    ]
    return ProjectPresenceResponse(items=items)


@router.get("/plugin-profiles/catalog", response_model=PluginProfileCatalogResponse)
async def list_plugin_profiles() -> PluginProfileCatalogResponse:
    """Manifest-driven node config profiles (LLM model, scraper sources, agent slots)."""
    from server.projects.plugin_profiles import build_plugin_profile_catalog

    payload = build_plugin_profile_catalog()
    return PluginProfileCatalogResponse(**payload)


@router.post("", response_model=ProjectDetail)
async def create_project(
    body: ProjectCreateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    created = get_project_flow_service().create_project(body)
    log_operation(
        user=username,
        operation_type="Project",
        details=f"Create {created['id']} ({created['name']})",
    )
    return ProjectDetail(**created)


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: str) -> ProjectDetail:
    record = get_project_flow_service().get_project(project_id)
    if not record:
        raise HTTPException(status_code=404, detail="project not found")
    return ProjectDetail(**record)


@router.get("/{project_id}/logs", response_model=ServiceLogListResponse)
async def get_project_logs(
    project_id: str,
    category: ProjectLogCategory = Query("operation"),
    q: str = Query(""),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> ServiceLogListResponse:
    """Service logs scoped to this project (matches project id in log details)."""
    from server.audit.service_logs import import_agent_runs_to_cron_logs, list_service_logs

    record = get_project_flow_service().get_project(project_id)
    if not record:
        raise HTTPException(status_code=404, detail="project not found")
    if category == "cron":
        import_agent_runs_to_cron_logs()
    needle = q.strip() or project_id
    items, total = list_service_logs(category, q=needle, limit=limit, offset=offset)
    return ServiceLogListResponse(
        category=category,
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch("/{project_id}", response_model=ProjectDetail)
async def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    svc = get_project_flow_service()
    try:
        updated = svc.update_project(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    log_operation(user=username, operation_type="Project", details=f"Update {project_id}")
    return ProjectDetail(**updated)


@router.put("/{project_id}/flow", response_model=ProjectDetail)
async def update_project_flow(
    project_id: str,
    body: ProjectFlowUpdateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectDetail:
    svc = get_project_flow_service()
    try:
        updated = svc.update_flow(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    log_operation(user=username, operation_type="Project flow", details=f"Save {project_id}")
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
    ok = get_project_flow_service().delete_project(project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="project not found")
    log_operation(user=username, operation_type="Project", details=f"Delete {project_id}")
    return {"ok": True}


@ws_router.websocket("/{project_id}/ws")
async def project_collaboration_ws(
    websocket: WebSocket,
    project_id: str,
    client_id: str = Query(..., min_length=8, max_length=64),
) -> None:
    username = authenticate_websocket(websocket)
    if username is None:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    svc = get_project_flow_service()
    project = svc.get_project(project_id)
    if not project:
        await websocket.close(code=4404, reason="project not found")
        return

    hub = get_project_collaboration_hub()
    await websocket.accept()
    await hub.join(project_id, client_id=client_id, username=username, websocket=websocket)
    await websocket.send_text(
        ws_message(
            "welcome",
            {
                "project_id": project_id,
                "client_id": client_id,
                "username": username,
                "peers": hub.peers_payload(project_id),
                "project": project,
            },
        )
    )

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=25.0)
            except TimeoutError:
                await websocket.send_text(
                    ws_message("heartbeat", {"project_id": project_id, "client_id": client_id})
                )
                continue
            await hub.handle_message(project_id, client_id=client_id, raw=raw)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(project_id, client_id)
