from typing import Any

from fastapi import Depends, HTTPException

from core.plugins import get_source_spec
from server.app_store import get_store_manager
from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas import (
    MessageResponse,
    StoreCatalogResponse,
    StoreConnectRequest,
    StoreEnvironmentResponse,
    StoreInstalledListResponse,
    StoreInstalledResponse,
    StoreInstallRequest,
    StorePluginDetailResponse,
)
from server.services.audit import log_operation

router = protected_router(prefix="/store", tags=["store"])


@router.get("/environment", response_model=StoreEnvironmentResponse)
async def store_environment() -> StoreEnvironmentResponse:
    return StoreEnvironmentResponse(**get_store_manager().get_environment())


@router.get("/catalog", response_model=StoreCatalogResponse)
async def store_catalog() -> StoreCatalogResponse:
    items = get_store_manager().list_catalog()
    return StoreCatalogResponse(items=items, total=len(items))


@router.get("/installed", response_model=StoreInstalledListResponse)
async def store_installed() -> StoreInstalledListResponse:
    items = get_store_manager().list_installed()
    return StoreInstalledListResponse(items=items, total=len(items))


@router.get("/plugins/{plugin_id}", response_model=StorePluginDetailResponse)
async def store_plugin_detail(plugin_id: str) -> StorePluginDetailResponse:
    return StorePluginDetailResponse(**get_store_manager().get_plugin_detail(plugin_id))


@router.get("/plugins/{plugin_id}/status", response_model=StoreInstalledResponse)
async def store_plugin_status(plugin_id: str) -> StoreInstalledResponse:
    return StoreInstalledResponse(**await get_store_manager().refresh_status(plugin_id))


@router.post("/plugins/{plugin_id}/install", response_model=StoreInstalledResponse)
async def store_install(
    plugin_id: str,
    body: StoreInstallRequest,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    if get_source_spec(plugin_id):
        result = await get_store_manager().enable_source(plugin_id)
        log_operation(
            user=username,
            operation_type="Store enable source",
            details=f"Enabled source plugin {plugin_id}",
            meta={"plugin_id": plugin_id, "mode": "source"},
        )
        return StoreInstalledResponse(**result)

    if body.mode == "docker":
        result = await get_store_manager().install_docker(
            plugin_id,
            port=body.port,
            version=body.version,
        )
        log_operation(
            user=username,
            operation_type="Store install",
            details=(
                f"Installed {plugin_id} via Docker "
                f"v{result['config'].get('driver_version')} "
                f"on port {result['config'].get('port')}"
            ),
            meta={"plugin_id": plugin_id, "mode": "docker"},
        )
        return StoreInstalledResponse(**result)

    if body.mode == "native":
        result = await get_store_manager().install_native(
            plugin_id,
            port=body.port,
            version=body.version,
        )
        log_operation(
            user=username,
            operation_type="Store install",
            details=(
                f"Installed {plugin_id} native driver "
                f"v{result['config'].get('driver_version')} "
                f"on port {result['config'].get('port')}"
            ),
            meta={"plugin_id": plugin_id, "mode": "native"},
        )
        return StoreInstalledResponse(**result)

    raise HTTPException(status_code=400, detail="use POST /connect for external mode")


@router.post("/plugins/{plugin_id}/connect", response_model=StoreInstalledResponse)
async def store_connect(
    plugin_id: str,
    body: StoreConnectRequest,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    config: dict[str, Any] = body.model_dump(exclude_unset=True)
    result = await get_store_manager().connect_external(plugin_id, config)
    log_operation(
        user=username,
        operation_type="Store connect",
        details=f"Connected external {plugin_id} at {config.get('host')}:{config.get('port')}",
        meta={"plugin_id": plugin_id, "mode": "external"},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/start", response_model=StoreInstalledResponse)
async def store_start(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().start(plugin_id)
    log_operation(
        user=username,
        operation_type="Store start",
        details=f"Started {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/stop", response_model=StoreInstalledResponse)
async def store_stop(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().stop(plugin_id)
    log_operation(
        user=username,
        operation_type="Store stop",
        details=f"Stopped {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/restart", response_model=StoreInstalledResponse)
async def store_restart(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().restart(plugin_id)
    log_operation(
        user=username,
        operation_type="Store restart",
        details=f"Restarted {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.delete("/plugins/{plugin_id}", response_model=MessageResponse)
async def store_uninstall(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> MessageResponse:
    await get_store_manager().uninstall(plugin_id)
    log_operation(
        user=username,
        operation_type="Store uninstall",
        details=f"Removed {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return MessageResponse(message=f"{plugin_id} uninstalled")
