from typing import Literal

from fastapi import HTTPException, Query

from server.deps import protected_router
from server.schemas import MessageResponse, ServiceLogListResponse
from server.stores.service_logs import (
    clear_service_logs,
    import_agent_runs_to_cron_logs,
    list_service_logs,
)

router = protected_router(prefix="/logs", tags=["logs"])

LogCategory = Literal["operation", "run", "cron"]


@router.get("", response_model=ServiceLogListResponse)
async def get_logs(
    category: LogCategory = Query("operation"),
    q: str = Query(""),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> ServiceLogListResponse:
    if category == "cron":
        import_agent_runs_to_cron_logs()
    items, total = list_service_logs(category, q=q, limit=limit, offset=offset)
    return ServiceLogListResponse(
        category=category,
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("", response_model=MessageResponse)
async def clear_logs(category: LogCategory = Query(...)) -> MessageResponse:
    if category not in ("operation", "run", "cron"):
        raise HTTPException(status_code=400, detail="invalid category")
    removed = clear_service_logs(category)
    return MessageResponse(message=f"Cleared {removed} log entries", ok=True)
