from server.deps import protected_router
from server.schemas import ServiceOverviewResponse, ServiceSchedulerStatus, ServiceSupportResponse
from server.services.panel_support import get_service_scheduler, get_service_support
from server.services.service_overview import get_service_overview

router = protected_router(prefix="/service", tags=["service"])


@router.get("/overview", response_model=ServiceOverviewResponse)
async def service_overview() -> ServiceOverviewResponse:
    return ServiceOverviewResponse(**await get_service_overview())


@router.get("/support", response_model=ServiceSupportResponse)
async def service_support() -> ServiceSupportResponse:
    return ServiceSupportResponse(**await get_service_support())


@router.get("/scheduler", response_model=ServiceSchedulerStatus)
async def service_scheduler() -> ServiceSchedulerStatus:
    return ServiceSchedulerStatus(**get_service_scheduler())
