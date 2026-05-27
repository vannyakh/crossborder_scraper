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


class GatewayAgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    prompt_id: str | None = None
    skill_ids: list[str] | None = Field(
        default=None,
        description="Optional skill ids; omit to use config/agent_skills.yaml enabled set",
    )


class GatewayAgentResponse(BaseModel):
    ok: bool
    message: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    model: str | None = None
    prompt_id: str | None = None
    skill_ids: list[str] = Field(default_factory=list)


class GatewaySkillInfo(BaseModel):
    id: str
    name: str
    description: str
    version: str = "1.0.0"
    category: str = "scrape"
    emoji: str = "🤖"
    tools: list[str] = Field(default_factory=list)
    homepage: str = ""
    enabled: bool = False
    installed: bool = True
    kind: Literal["builtin", "installed"] = "builtin"
    trusted: bool = True
    path: str = ""


class GatewaySkillListResponse(BaseModel):
    items: list[GatewaySkillInfo]
    total: int
    enabled: list[str] = Field(default_factory=list)


class GatewaySkillEnableRequest(BaseModel):
    enabled: list[str] = Field(default_factory=list)


class SkillInstallResponse(BaseModel):
    ok: bool = True
    skill_id: str
    name: str = ""
    version: str = "1.0.0"
    workspace: str = ""
    tools: list[str] = Field(default_factory=list)


class SkillUninstallResponse(BaseModel):
    ok: bool = True
    skill_id: str
    removed: bool = True


class GatewayPromptInfo(BaseModel):
    id: str
    label: str
    path: str
    recommended: bool = False


class GatewayPromptListResponse(BaseModel):
    items: list[GatewayPromptInfo]


class AgentSchedule(BaseModel):
    id: str
    name: str
    enabled: bool = True
    cron: str
    prompt_id: str = "gateway_agent"
    message: str
    next_run_at: str | None = None
    last_run_at: str | None = None
    last_status: str | None = None
    last_error: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AgentScheduleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    enabled: bool = True
    cron: str = Field(..., min_length=9, max_length=64)
    prompt_id: str = "gateway_agent"
    message: str = Field(..., min_length=1, max_length=8000)


class AgentScheduleUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    cron: str | None = None
    prompt_id: str | None = None
    message: str | None = None


class AgentScheduleListResponse(BaseModel):
    items: list[AgentSchedule]


class AgentRunRecord(BaseModel):
    id: str
    schedule_id: str | None = None
    schedule_name: str | None = None
    trigger: str | None = None
    prompt_id: str | None = None
    message: str | None = None
    status: str | None = None
    ok: bool | None = None
    response: str | None = None
    error: str | None = None
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    started_at: str | None = None
    finished_at: str | None = None


class AgentRunListResponse(BaseModel):
    items: list[AgentRunRecord]


class GatewayStatusResponse(BaseModel):
    service: str
    version: str
    control_plane: str
    clients: list[str]
    tools_count: int
    skills_count: int = 0
    enabled_skills_count: int = 0
    workflows_count: int
    schedules_count: int = 0
    enabled_schedules_count: int = 0
    recent_failed_runs: int = 0
    runtime: dict[str, Any]


class ServiceGatewaySummary(BaseModel):
    service: str
    version: str
    control_plane: str
    clients: list[str]
    tools_count: int
    skills_count: int = 0
    enabled_skills_count: int = 0
    workflows_count: int
    schedules_count: int = 0
    enabled_schedules_count: int = 0
    recent_failed_runs: int = 0


class ServiceOverviewResponse(BaseModel):
    runtime: dict[str, Any]
    gateway: ServiceGatewaySummary
    llm: dict[str, Any] | None = None


class ServiceSupportLink(BaseModel):
    id: str
    label: str
    description: str
    path: str
    external: bool = False


class ServiceSupportCheck(BaseModel):
    id: str
    label: str
    ok: bool
    detail: str


class ServiceSchedulerTask(BaseModel):
    id: str
    name: str
    enabled: bool
    cron: str
    prompt_id: str = ""
    next_run_at: str | None = None
    last_run_at: str | None = None
    last_status: str | None = None
    last_error: str | None = None


class ServiceSchedulerStatus(BaseModel):
    running: bool
    tick_seconds: int
    schedules_path: str
    total: int
    enabled: int
    failed_last_run: int
    tasks: list[ServiceSchedulerTask]


class ServiceSupportLogsSummary(BaseModel):
    operation: int
    run: int
    cron: int
    total: int
    path: str


class ServiceSupportPaths(BaseModel):
    schedules: str
    agent_runs: str
    service_logs: str
    db: str
    output: str
    cookies: str


class ServiceSupportResponse(BaseModel):
    runtime: dict[str, Any]
    gateway: ServiceGatewaySummary
    scheduler: ServiceSchedulerStatus
    stats: StatsResponse
    logs: ServiceSupportLogsSummary
    paths: ServiceSupportPaths
    panel: dict[str, Any]
    checks: list[ServiceSupportCheck]
    links: list[ServiceSupportLink]


class GatewayToolListResponse(BaseModel):
    items: list[dict[str, Any]]


class GatewayWorkflowListResponse(BaseModel):
    items: list[dict[str, Any]]


class GatewayWorkflowRunRequest(BaseModel):
    inputs: dict[str, Any] = Field(default_factory=dict)


class GatewayWorkflowRunResponse(BaseModel):
    workflow: str
    status: str
    steps: list[dict[str, Any]]
    context: dict[str, Any]


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


class PanelAccessResponse(BaseModel):
    bind_host: str
    bind_port: int
    access_ip: str
    access_port: int
    panel_path: str
    panel_url: str
    copy_text: str


class ServiceLogEntry(BaseModel):
    id: str
    category: str
    user: str
    operation_type: str
    details: str
    created_at: str
    meta: dict[str, Any] = Field(default_factory=dict)


class ServiceLogListResponse(BaseModel):
    category: str
    items: list[ServiceLogEntry]
    total: int
    limit: int
    offset: int


class StoreConnectionField(BaseModel):
    key: str
    label: str
    type: Literal["text", "number", "password"] = "text"
    required: bool = True
    default: str | int | None = None


class ScrapeCapabilitiesResponse(BaseModel):
    supports_login: bool = False
    supports_pagination: bool = False
    supports_variants: bool = False
    supports_browser: bool = True
    supports_ai_extraction: bool = True
    supports_ai_enrichment: bool = True
    supports_batch: bool = True
    max_concurrency: int = 5
    requires_cookies: bool = False
    anti_bot_level: Literal["low", "medium", "high"] = "medium"


class PluginScrapeSpecResponse(BaseModel):
    plugin_type: str
    market: str
    data_fields: list[str] = Field(default_factory=list)
    page_types: list[str] = Field(default_factory=list)
    example_urls: list[str] = Field(default_factory=list)
    output_model: str = "ScrapedProduct"
    currency_default: str = "CNY"
    capabilities: ScrapeCapabilitiesResponse = Field(default_factory=ScrapeCapabilitiesResponse)
    notes: str = ""
    standard_fields_available: list[str] = Field(default_factory=list)


class StoreCatalogItem(BaseModel):
    id: str
    kind: Literal["service", "source", "site"] | None = None
    name: str
    category: str
    description: str
    version: str
    default_port: int = 0
    supports_docker: bool = False
    supports_external: bool = False
    docker_image: str = ""
    tags: list[str] = Field(default_factory=list)
    connection_fields: list[StoreConnectionField] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    installed: bool = False
    status: str = "not_installed"
    mode: str | None = None
    enabled: bool | None = None
    trusted: bool | None = None
    sandboxed: bool | None = None
    permissions: dict[str, bool] | None = None
    scrape_spec: PluginScrapeSpecResponse | None = None


class StoreCatalogResponse(BaseModel):
    items: list[StoreCatalogItem]
    total: int


class StoreBuiltinSqlite(BaseModel):
    label: str
    path: str
    description: str


class StoreEnvironmentResponse(BaseModel):
    docker_available: bool
    compose_available: bool
    store_dir: str
    builtin_sqlite: StoreBuiltinSqlite


class StoreProbeResponse(BaseModel):
    ok: bool
    message: str = ""
    host: str | None = None
    port: int | None = None


class StoreInstalledConfig(BaseModel):
    host: str | None = None
    port: int | None = None
    username: str | None = None
    database: str | None = None
    password_set: bool = False
    management_port: int | None = None
    container_name: str | None = None


class StoreInstalledResponse(BaseModel):
    plugin_id: str
    name: str
    category: str
    mode: str | None = None
    status: str
    installed_at: str | None = None
    updated_at: str | None = None
    config: StoreInstalledConfig | dict[str, Any] = Field(default_factory=dict)
    probe: dict[str, Any] | None = None
    error: str | None = None
    container_name: str | None = None


class StoreInstalledListResponse(BaseModel):
    items: list[StoreInstalledResponse]
    total: int


class StorePluginDetailResponse(StoreCatalogItem):
    installation: StoreInstalledResponse | None = None


class PluginPermissionsResponse(BaseModel):
    network: bool = False
    browser: bool = False
    filesystem: bool = False
    subprocess: bool = False


class PluginSecurityPolicyResponse(BaseModel):
    max_zip_bytes: int
    max_files_in_zip: int
    max_plugin_py_bytes: int
    scrape_timeout_seconds: int
    trusted_builtin_ids: list[str]
    blocked_import_roots: list[str]
    install_requirements: list[str]


class PluginInstallResponse(BaseModel):
    ok: bool = True
    plugin_id: str
    version: str
    sandboxed: bool = True
    workspace: str
    permissions: dict[str, bool] = Field(default_factory=dict)


class PluginUninstallResponse(BaseModel):
    ok: bool = True
    plugin_id: str
    removed: bool = True


class PluginScrapeSpecificationsResponse(BaseModel):
    items: list[StoreCatalogItem]
    total: int
    standard_data_fields: list[str] = Field(default_factory=list)


class StoreInstallRequest(BaseModel):
    mode: Literal["docker"] = "docker"
    port: int | None = Field(default=None, ge=1, le=65535)


class StoreConnectRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int | None = None
    username: str | None = None
    password: str | None = None
    database: str | None = None
    management_port: int | None = None


# Re-export for routers
__all__ = [
    "AgentRunListResponse",
    "AgentRunRecord",
    "AgentSchedule",
    "AgentScheduleCreate",
    "AgentScheduleListResponse",
    "AgentScheduleUpdate",
    "GatewayAgentRequest",
    "GatewayAgentResponse",
    "GatewayPromptInfo",
    "GatewayPromptListResponse",
    "GatewayStatusResponse",
    "GatewayToolListResponse",
    "GatewayWorkflowListResponse",
    "GatewayWorkflowRunRequest",
    "GatewayWorkflowRunResponse",
    "ServiceGatewaySummary",
    "ServiceOverviewResponse",
    "ServiceSupportResponse",
    "ServiceSchedulerStatus",
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
    "HardwareMonitorResponse",
    "MonitorStatusResponse",
    "PanelAccessResponse",
    "ServiceLogEntry",
    "ServiceLogListResponse",
    "MessageResponse",
    "ProductListResponse",
    "RuntimeStatusResponse",
    "ScrapeSingleRequest",
    "ScrapeSingleResponse",
    "StatsResponse",
    "StatusResponse",
    "StoreCatalogResponse",
    "StoreConnectRequest",
    "StoreEnvironmentResponse",
    "StoreInstallRequest",
    "StoreInstalledListResponse",
    "StoreInstalledResponse",
    "StorePluginDetailResponse",
    "StoreProbeResponse",
    "PluginPermissionsResponse",
    "PluginSecurityPolicyResponse",
    "PluginInstallResponse",
    "PluginUninstallResponse",
    "SubmitRequest",
    "SubmitResponse",
]
