from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from config import TargetMarketplace
from core.engine.jobs import BatchReport, JobResult


class SubmitRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1)
    workers: int | None = None
    use_ai: bool | None = None
    save: bool = True
    session_id: str | None = None


class SubmitResponse(BaseModel):
    batch_id: str
    total: int
    status: str = "accepted"


class StatusResponse(BaseModel):
    started_at: datetime
    running: bool
    completed: int
    total: int
    success: int
    failed: int
    status: str = "running"


class ProductSummary(BaseModel):
    id: int
    source: str
    source_product_id: str
    source_url: str
    title: str
    created_at: str
    updated_at: str


class ProductListResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    limit: int
    offset: int


class BatchSummary(BaseModel):
    batch_id: str
    status: str
    total: int
    completed: int
    success: int
    failed: int
    workers: int | None
    use_ai: bool
    save_results: bool
    started_at: str
    finished_at: str | None


class BatchListResponse(BaseModel):
    items: list[BatchSummary]
    total: int
    limit: int
    offset: int


class BatchDetailResponse(BatchSummary):
    results: list[dict[str, Any]]


class FileEntry(BaseModel):
    path: str
    name: str
    size_bytes: int
    modified_at: str
    kind: str


class FileListResponse(BaseModel):
    items: list[FileEntry]
    output_dir: str


class StatsResponse(BaseModel):
    products: int
    batches: int
    output_files: int
    running_batches: int
    cookies_sessions: dict[str, list[str]]


class ExportRequest(BaseModel):
    product_id: int | None = None
    url: str | None = None
    marketplace: TargetMarketplace
    dry_run: bool = True


class ExportResponse(BaseModel):
    marketplace: str
    dry_run: bool
    listing: dict[str, Any]
    published: bool = False
    api_response: dict[str, Any] | None = None


class ScrapeSingleRequest(BaseModel):
    url: str
    use_ai: bool | None = None
    save: bool = True
    session_id: str | None = None


class ScrapeSingleResponse(BaseModel):
    job_id: str
    status: Literal["success", "failed"]
    product_id: int | None = None
    result: JobResult | None = None
    error: str | None = None


class MessageResponse(BaseModel):
    message: str
    batch_id: str | None = None


class MarketplaceCredentialsUpdate(BaseModel):
    credentials: dict[str, str | None] | None = None
    enabled: bool | None = None
    label: str | None = None


class MarketplaceEntry(BaseModel):
    label: str
    enabled: bool
    credentials: dict[str, str | None] = Field(default_factory=dict)
    supports_export: bool = False


class PanelConfigResponse(BaseModel):
    ai_enabled: bool
    ai_fallback: bool
    ai_agent_enabled: bool
    ai_model: str
    ai_max_html_chars: int
    ai_timeout_seconds: float
    price_markup_percent: float
    default_currency: str
    scrape_default_workers: int
    headless: bool
    browser_timeout_ms: int
    request_delay_seconds: float
    proxy_list_path: str | None = None
    proxy_rotation_strategy: str
    max_concurrent_jobs: int
    ai_base_url: str
    ai_api_key_set: bool
    ai_api_key_masked: str | None = None
    proxy_server_set: bool = False
    proxy_server_masked: str | None = None
    marketplaces: dict[str, MarketplaceEntry]
    ui_config_path: str
    config_dir: str
    secrets_from_env: bool = False
    secrets_from_panel_config: bool = True


class PanelConfigUpdate(BaseModel):
    ai_enabled: bool | None = None
    ai_fallback: bool | None = None
    ai_agent_enabled: bool | None = None
    ai_model: str | None = None
    ai_max_html_chars: int | None = Field(default=None, ge=1000, le=200_000)
    ai_timeout_seconds: float | None = Field(default=None, ge=5.0, le=300.0)
    price_markup_percent: float | None = Field(default=None, ge=0.0, le=500.0)
    default_currency: str | None = Field(default=None, min_length=3, max_length=3)
    scrape_default_workers: int | None = Field(default=None, ge=1, le=50)
    headless: bool | None = None
    browser_timeout_ms: int | None = Field(default=None, ge=5_000, le=300_000)
    request_delay_seconds: float | None = Field(default=None, ge=0.0, le=60.0)
    proxy_list_path: str | None = None
    proxy_rotation_strategy: Literal["round_robin", "random"] | None = None
    max_concurrent_jobs: int | None = Field(default=None, ge=1, le=50)
    proxy_server: str | None = None
    ai_api_key: str | None = None
    ai_base_url: str | None = None
    marketplaces: dict[str, MarketplaceCredentialsUpdate] | None = None


class AIConfigResponse(BaseModel):
    ai_enabled: bool
    ai_fallback: bool
    ai_agent_enabled: bool
    ai_model: str
    ai_base_url: str
    ai_max_html_chars: int
    ai_timeout_seconds: float
    ai_api_key_set: bool
    ai_api_key_masked: str | None = None
    ui_config_path: str
    secrets_from_env: bool = True


class AIConfigUpdate(BaseModel):
    ai_enabled: bool | None = None
    ai_fallback: bool | None = None
    ai_agent_enabled: bool | None = None
    ai_model: str | None = None
    ai_max_html_chars: int | None = Field(default=None, ge=1000, le=200_000)
    ai_timeout_seconds: float | None = Field(default=None, ge=5.0, le=300.0)


class LLMHealthResponse(BaseModel):
    ok: bool
    status: str
    message: str
    model: str
    base_url: str
    models_count: int | None = None
    model_available: bool | None = None
    probe: str | None = None


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


# Re-export for routers
__all__ = [
    "AIConfigResponse",
    "AIConfigUpdate",
    "PanelConfigResponse",
    "PanelConfigUpdate",
    "BatchDetailResponse",
    "BatchListResponse",
    "BatchReport",
    "ExportRequest",
    "ExportResponse",
    "FileListResponse",
    "LLMHealthResponse",
    "MarketplaceInfo",
    "MarketplaceListResponse",
    "MessageResponse",
    "ProductListResponse",
    "RuntimeStatusResponse",
    "ScrapeSingleRequest",
    "ScrapeSingleResponse",
    "StatsResponse",
    "StatusResponse",
    "SubmitRequest",
    "SubmitResponse",
]
