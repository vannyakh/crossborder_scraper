from fastapi import Depends, HTTPException, Query

from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas.docker import (
    DockerConfigResponse,
    DockerConfigUpdate,
    DockerContainerActionResponse,
    DockerContainerListResponse,
    DockerHubListResponse,
    DockerInstallResponse,
    DockerPullResponse,
    DockerRunRequest,
    DockerRunResponse,
    DockerServiceActionResponse,
    DockerStatusResponse,
)
from server.services.audit import log_operation
from server.services.docker_host import get_docker_host_service

router = protected_router(prefix="/docker", tags=["docker"])


@router.get("/status", response_model=DockerStatusResponse)
async def docker_status() -> DockerStatusResponse:
    return DockerStatusResponse(**get_docker_host_service().get_status())


@router.get("/config", response_model=DockerConfigResponse)
async def docker_config() -> DockerConfigResponse:
    return DockerConfigResponse(**get_docker_host_service().get_config())


@router.patch("/config", response_model=DockerConfigResponse)
async def update_docker_config(
    body: DockerConfigUpdate,
    username: str = Depends(require_panel_auth),
) -> DockerConfigResponse:
    patch = body.model_dump(exclude_unset=True)
    data = get_docker_host_service().update_config(patch)
    log_operation(
        user=username,
        operation_type="Docker config",
        details=f"Updated panel docker settings: {', '.join(patch.keys())}",
    )
    return DockerConfigResponse(**data)


@router.post("/install", response_model=DockerInstallResponse)
async def install_docker(username: str = Depends(require_panel_auth)) -> DockerInstallResponse:
    result = await get_docker_host_service().install(username=username)
    log_operation(
        user=username,
        operation_type="Docker install",
        details="; ".join(result.get("messages") or [])[:500],
    )
    return DockerInstallResponse(**result)


@router.post("/service/{action}", response_model=DockerServiceActionResponse)
async def docker_service_action(
    action: str,
    username: str = Depends(require_panel_auth),
) -> DockerServiceActionResponse:
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="action must be start, stop, or restart")
    result = get_docker_host_service().service_control(action)
    log_operation(
        user=username,
        operation_type="Docker service",
        details=f"{action}: {result.get('message', '')[:200]}",
    )
    return DockerServiceActionResponse(**result)


@router.get("/containers", response_model=DockerContainerListResponse)
async def list_docker_containers() -> DockerContainerListResponse:
    return DockerContainerListResponse(**get_docker_host_service().list_containers())


@router.post("/containers/{container_id}/{action}", response_model=DockerContainerActionResponse)
async def docker_container_action(
    container_id: str,
    action: str,
    username: str = Depends(require_panel_auth),
) -> DockerContainerActionResponse:
    if action not in ("start", "stop", "restart", "remove"):
        raise HTTPException(status_code=400, detail="invalid container action")
    result = get_docker_host_service().container_action(container_id, action)
    log_operation(
        user=username,
        operation_type="Docker container",
        details=f"{action} {container_id}: {result.get('message', '')[:200]}",
    )
    return DockerContainerActionResponse(**result)


@router.get("/hub", response_model=DockerHubListResponse)
async def docker_hub_search(
    q: str | None = Query(None, max_length=120),
    limit: int = Query(24, ge=1, le=50),
) -> DockerHubListResponse:
    svc = get_docker_host_service()
    if q and q.strip():
        data = await svc.hub_search(query=q, limit=limit)
    else:
        data = svc.hub_featured()
    return DockerHubListResponse(**data)


@router.post("/pull", response_model=DockerPullResponse)
async def docker_pull_image(
    image: str = Query(..., min_length=1, max_length=256),
    username: str = Depends(require_panel_auth),
) -> DockerPullResponse:
    result = await get_docker_host_service().pull_image(image)
    log_operation(
        user=username,
        operation_type="Docker pull",
        details=f"{image}: {result.get('message', '')[:200]}",
    )
    return DockerPullResponse(**result)


@router.post("/run", response_model=DockerRunResponse)
async def docker_run_container(
    body: DockerRunRequest,
    username: str = Depends(require_panel_auth),
) -> DockerRunResponse:
    result = await get_docker_host_service().run_container(
        image=body.image,
        name=body.name,
        port=body.port,
        host_port=body.host_port,
    )
    log_operation(
        user=username,
        operation_type="Docker run",
        details=f"{body.image} -> {result.get('container_name', '')}: {result.get('message', '')[:200]}",
    )
    return DockerRunResponse(**result)
