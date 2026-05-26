from typing import Any

from fastapi import APIRouter

from server.manager import get_manager
from server.schemas import StatsResponse

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config")
async def config() -> dict[str, Any]:
    return get_manager().get_config()


@router.get("/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    return StatsResponse(**get_manager().get_stats())
