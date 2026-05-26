from config import get_settings
from core.hardware import collect_hardware
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import HardwareMonitorResponse, MonitorStatusResponse
from server.services.runtime import get_service_runtime

router = protected_router(prefix="/monitor", tags=["monitor"])


@router.get("/hardware", response_model=HardwareMonitorResponse)
async def hardware_monitor() -> HardwareMonitorResponse:
    settings = get_settings()
    data = collect_hardware(disk_path=settings.output_dir)
    return HardwareMonitorResponse(**data)


@router.get("/status", response_model=MonitorStatusResponse)
async def monitor_status() -> MonitorStatusResponse:
    settings = get_settings()
    hardware = collect_hardware(disk_path=settings.output_dir)
    service = get_service_runtime(get_manager())
    return MonitorStatusResponse(
        collected_at=hardware["collected_at"],
        hardware=HardwareMonitorResponse(**hardware),
        service=service,
    )
