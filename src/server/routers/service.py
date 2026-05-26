from server.deps import protected_router
from server.schemas import ServiceOverviewResponse
from server.services.service_overview import get_service_overview

router = protected_router(prefix="/service", tags=["service"])


@router.get("/overview", response_model=ServiceOverviewResponse)
async def service_overview() -> ServiceOverviewResponse:
    return ServiceOverviewResponse(**await get_service_overview())
