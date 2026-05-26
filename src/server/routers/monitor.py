from datetime import datetime

from config import get_settings
from core.hardware import collect_hardware
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import HardwareMonitorResponse, MonitorStatusResponse

router = protected_router(prefix="/monitor", tags=["monitor"])
SERVICE_STARTED_AT = datetime.utcnow()


@router.get("/hardware", response_model=HardwareMonitorResponse)
async def hardware_monitor() -> HardwareMonitorResponse:
    settings = get_settings()
    data = collect_hardware(disk_path=settings.output_dir)
    return HardwareMonitorResponse(**data)


@router.get("/status", response_model=MonitorStatusResponse)
async def monitor_status() -> MonitorStatusResponse:
    settings = get_settings()
    mgr = get_manager()
    hardware = collect_hardware(disk_path=settings.output_dir)
    service = mgr.get_runtime_status(started_at=SERVICE_STARTED_AT)
    return MonitorStatusResponse(
        collected_at=hardware["collected_at"],
        hardware=HardwareMonitorResponse(**hardware),
        service=service,
    )
