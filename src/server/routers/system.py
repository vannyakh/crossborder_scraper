from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from config import get_settings
from core.proxy_health import proxy_status, test_proxy_egress
from server.auth import require_panel_auth
from server.core.constants import APP_VERSION
from server.core.panel_bind import get_panel_bind_info
from server.deps import protected_router
from server.schemas import (
    PanelAccessResponse,
    PanelConfigResponse,
    PanelConfigUpdate,
    ProxyStatusResponse,
    ProxyTestResponse,
    StatsResponse,
)
from server.services.audit import log_operation
from server.services.config import get_config_service
from server.services.runtime import get_stats

public_router = APIRouter(tags=["system"])
protected = protected_router(tags=["system"])


@public_router.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "version": APP_VERSION,
        "auth_enabled": settings.panel_auth_enabled,
        "auth_configured": bool(settings.panel_username and settings.panel_password),
    }


@public_router.get("/panel/access", response_model=PanelAccessResponse)
async def panel_access() -> PanelAccessResponse:
    """TCP access IP/port for the panel (from server bind at startup)."""
    return PanelAccessResponse(**get_panel_bind_info())


@protected.get("/config")
async def config() -> dict[str, Any]:
    return get_config_service().get_config()


@protected.get("/config/panel", response_model=PanelConfigResponse)
async def get_panel_config() -> PanelConfigResponse:
    return PanelConfigResponse(**get_config_service().get_panel_config())


@protected.patch("/config/panel", response_model=PanelConfigResponse)
async def patch_panel_config(
    body: PanelConfigUpdate,
    username: str = Depends(require_panel_auth),
) -> PanelConfigResponse:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    result = get_config_service().update_panel_config(updates)
    log_operation(
        user=username,
        operation_type="Panel configuration",
        details=f"Updated settings: {', '.join(sorted(updates.keys()))}",
    )
    return PanelConfigResponse(**result)


@protected.get("/config/proxy/status", response_model=ProxyStatusResponse)
async def get_proxy_status() -> ProxyStatusResponse:
    return ProxyStatusResponse(**proxy_status(get_settings()))


@protected.post("/config/proxy/test", response_model=ProxyTestResponse)
async def post_proxy_test() -> ProxyTestResponse:
    result = await test_proxy_egress(get_settings())
    return ProxyTestResponse(**result)


@protected.get("/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    return StatsResponse(**get_stats())

# Combined for app.include_router
router = APIRouter()
router.include_router(public_router)
router.include_router(protected)
