from server.deps import protected_router
from server.manager import get_manager
from server.schemas import MarketplaceInfo, MarketplaceListResponse, RuntimeStatusResponse
from server.services.marketplace import list_marketplace_items
from server.services.runtime import get_service_runtime

router = protected_router(tags=["runtime"])


@router.get("/runtime/status", response_model=RuntimeStatusResponse)
async def runtime_status() -> RuntimeStatusResponse:
    data = get_service_runtime(get_manager())
    return RuntimeStatusResponse(**data)


@router.get("/export/marketplaces", response_model=MarketplaceListResponse)
async def list_marketplaces() -> MarketplaceListResponse:
    items = [MarketplaceInfo(**row) for row in list_marketplace_items()]
    return MarketplaceListResponse(items=items)
