from typing import Any

from fastapi import APIRouter

from config import get_settings
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import StatsResponse

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


@protected.get("/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    return StatsResponse(**get_manager().get_stats())

# Combined for app.include_router
router = APIRouter()
router.include_router(public_router)
router.include_router(protected)
