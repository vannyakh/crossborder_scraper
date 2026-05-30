from fastapi import Depends, HTTPException

from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas.vhost import (
    VhostActionResponse,
    VhostCertbotRequest,
    VhostSiteCreateRequest,
    VhostSiteListResponse,
    VhostSiteToggleRequest,
    VhostStatusResponse,
)
from server.services.audit import log_operation
from server.services.vhost_service import get_vhost_service

router = protected_router(prefix="/vhost", tags=["vhost"])


@router.get("/status", response_model=VhostStatusResponse)
async def vhost_status() -> VhostStatusResponse:
    return VhostStatusResponse(**get_vhost_service().get_status())


@router.get("/sites", response_model=VhostSiteListResponse)
async def vhost_sites() -> VhostSiteListResponse:
    return VhostSiteListResponse(**get_vhost_service().list_sites())


@router.post("/sites", response_model=VhostActionResponse)
async def create_vhost_site(
    body: VhostSiteCreateRequest,
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = get_vhost_service().create_site(body.model_dump())
    log_operation(
        user=username,
        operation_type="Virtual host",
        details=f"Create {body.domain} → :{body.upstream_port}",
    )
    return VhostActionResponse(**result)


@router.post("/sites/{site_id}/enable", response_model=VhostActionResponse)
async def enable_vhost_site(
    site_id: str,
    body: VhostSiteToggleRequest,
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    if not body.enabled:
        raise HTTPException(status_code=400, detail="use /disable to disable a site")
    result = get_vhost_service().set_enabled(site_id, enabled=True)
    log_operation(user=username, operation_type="Virtual host", details=f"Enable {site_id}")
    return VhostActionResponse(**result)


@router.post("/sites/{site_id}/disable", response_model=VhostActionResponse)
async def disable_vhost_site(
    site_id: str,
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = get_vhost_service().set_enabled(site_id, enabled=False)
    log_operation(user=username, operation_type="Virtual host", details=f"Disable {site_id}")
    return VhostActionResponse(**result)


@router.delete("/sites/{site_id}", response_model=VhostActionResponse)
async def delete_vhost_site(
    site_id: str,
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = get_vhost_service().delete_site(site_id)
    log_operation(user=username, operation_type="Virtual host", details=f"Delete {site_id}")
    return VhostActionResponse(**result)


@router.post("/reload", response_model=VhostActionResponse)
async def reload_vhost_nginx(
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = get_vhost_service().reload()
    log_operation(user=username, operation_type="Virtual host", details="Reload nginx")
    return VhostActionResponse(**result)


@router.post("/install", response_model=VhostActionResponse)
async def install_vhost_nginx(
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = await get_vhost_service().install_nginx()
    log_operation(user=username, operation_type="Virtual host", details="Install nginx")
    return VhostActionResponse(
        ok=result.get("ok", False),
        messages=result.get("messages") or [],
        status=VhostStatusResponse(**result["status"]) if result.get("status") else None,
    )


@router.post("/certbot", response_model=VhostActionResponse)
async def apply_vhost_certbot(
    body: VhostCertbotRequest,
    username: str = Depends(require_panel_auth),
) -> VhostActionResponse:
    result = get_vhost_service().request_certbot(body.domain)
    log_operation(
        user=username,
        operation_type="Virtual host",
        details=f"Certbot {body.domain}",
    )
    return VhostActionResponse(**result)
