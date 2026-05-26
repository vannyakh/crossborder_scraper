from typing import Any

from fastapi import APIRouter, HTTPException

from config import get_settings
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import PanelConfigResponse, PanelConfigUpdate, StatsResponse

public_router = APIRouter(tags=["system"])
protected = protected_router(tags=["system"])


@public_router.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "auth_enabled": settings.panel_auth_enabled,
        "auth_configured": bool(settings.panel_username and settings.panel_password),
    }


@protected.get("/config")
async def config() -> dict[str, Any]:
    return get_manager().get_config()


@protected.get("/config/panel", response_model=PanelConfigResponse)
async def get_panel_config() -> PanelConfigResponse:
    return PanelConfigResponse(**get_manager().get_panel_config())


@protected.patch("/config/panel", response_model=PanelConfigResponse)
async def patch_panel_config(body: PanelConfigUpdate) -> PanelConfigResponse:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    return PanelConfigResponse(**get_manager().update_panel_config(updates))


@protected.get("/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    return StatsResponse(**get_manager().get_stats())

# Combined for app.include_router
router = APIRouter()
router.include_router(public_router)
router.include_router(protected)
