from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .config import AIConfigResponse


class RuntimeBatchInfo(BaseModel):
    batch_id: str
    status: str
    completed: int
    total: int
    success: int
    failed: int
    running: bool


class RuntimeStatusResponse(BaseModel):
    service: str
    version: str
    started_at: datetime
    uptime_seconds: float
    running_batches: list[RuntimeBatchInfo]
    active_tasks: int
    ai: AIConfigResponse
    engine: dict[str, Any]
    storage: dict[str, Any]
    cookies_sessions: dict[str, list[str]]


class MarketplaceInfo(BaseModel):
    id: str
    label: str
    configured: bool
    supports_export: bool = True


class MarketplaceListResponse(BaseModel):
    items: list[MarketplaceInfo]


class HardwareCpuInfo(BaseModel):
    percent: float
    count_logical: int
    count_physical: int | None = None
    model_name: str = ""
    architecture_summary: str = ""
    per_core_percent: list[float] = Field(default_factory=list)


class HardwareMemoryInfo(BaseModel):
    used_bytes: int
    total_bytes: int
    available_bytes: int
    percent: float
    used_human: str
    total_human: str
    available_human: str = ""
    swap_percent: float | None = None
    swap_used_human: str | None = None
    swap_total_human: str | None = None


class HardwareDiskInfo(BaseModel):
    path: str
    used_bytes: int
    total_bytes: int
    free_bytes: int
    percent: float
    used_human: str
    total_human: str
    free_human: str = ""


class HardwareProcessEntry(BaseModel):
    pid: int
    name: str
    cpu_percent: float | None = None
    memory_percent: float | None = None
    rss_human: str | None = None


class HardwareLoadInfo(BaseModel):
    load_1: float
    load_5: float
    load_15: float
    percent: float


class HardwareProcessInfo(BaseModel):
    rss_bytes: int
    rss_human: str
    threads: int


class HardwareMonitorResponse(BaseModel):
    collected_at: datetime
    hostname: str
    platform: str
    python_version: str
    system_label: str = "System"
    system_detail: str = ""
    host_uptime_seconds: float = 0.0
    host_uptime_label: str = ""
    cpu: HardwareCpuInfo
    memory: HardwareMemoryInfo
    disk: HardwareDiskInfo
    load: HardwareLoadInfo
    process: HardwareProcessInfo
    top_cpu_processes: list[HardwareProcessEntry] = Field(default_factory=list)
    top_memory_processes: list[HardwareProcessEntry] = Field(default_factory=list)


class MonitorStatusResponse(BaseModel):
    collected_at: datetime
    hardware: HardwareMonitorResponse
    service: dict[str, Any]
