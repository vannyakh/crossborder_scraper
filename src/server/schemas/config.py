from typing import Literal

from pydantic import BaseModel, Field


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
    ai_provider: str = "openai"
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
    vpn_enabled: bool = False
    vpn_mode: Literal["local_socks", "wireguard"] = "local_socks"
    vpn_endpoint_set: bool = False
    vpn_local_endpoint_masked: str | None = None
    vpn_config_path: str | None = None
    marketplaces: dict[str, MarketplaceEntry]
    ui_config_path: str
    config_dir: str
    secrets_from_env: bool = False
    secrets_from_panel_config: bool = True


class PanelConfigUpdate(BaseModel):
    ai_provider: str | None = None
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
    vpn_enabled: bool | None = None
    vpn_mode: Literal["local_socks", "wireguard"] | None = None
    vpn_local_endpoint: str | None = None
    vpn_config_path: str | None = None
    ai_api_key: str | None = None
    ai_base_url: str | None = None
    marketplaces: dict[str, MarketplaceCredentialsUpdate] | None = None


class LLMProviderInfo(BaseModel):
    id: str
    label: str
    base_url: str
    default_model: str
    api_style: str
    requires_api_key: bool
    api_key_hint: str
    docs_url: str = ""


class LLMProviderListResponse(BaseModel):
    providers: list[LLMProviderInfo]


class LLMModelItem(BaseModel):
    id: str
    label: str | None = None


class LLMModelsProbeRequest(BaseModel):
    ai_provider: str | None = None
    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None


class LLMHealthProbeRequest(BaseModel):
    ai_provider: str | None = None
    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None


class LLMModelsListResponse(BaseModel):
    provider: str
    provider_label: str
    models: list[LLMModelItem]
    source: Literal["api", "default", "missing_key", "ollama_offline", "ollama_empty"] = "default"
    message: str = ""


class OllamaPullRequest(BaseModel):
    model: str
    base_url: str = "http://127.0.0.1:11434/v1"


class OllamaPullResponse(BaseModel):
    ok: bool
    model: str
    message: str


class AIConfigResponse(BaseModel):
    ai_provider: str = "openai"
    provider_label: str = "OpenAI"
    model_ref: str = "openai/gpt-4o-mini"
    ai_enabled: bool
    ai_fallback: bool
    ai_agent_enabled: bool
    ai_model: str
    ai_base_url: str
    ai_max_html_chars: int
    ai_timeout_seconds: float
    ai_api_key_set: bool
    ai_api_key_masked: str | None = None
    llm_ready: bool = False
    ui_config_path: str
    secrets_from_env: bool = True


class AIConfigUpdate(BaseModel):
    ai_provider: str | None = None
    ai_enabled: bool | None = None
    ai_fallback: bool | None = None
    ai_agent_enabled: bool | None = None
    ai_model: str | None = None
    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_max_html_chars: int | None = Field(default=None, ge=1000, le=200_000)
    ai_timeout_seconds: float | None = Field(default=None, ge=5.0, le=300.0)


class LLMHealthResponse(BaseModel):
    ok: bool
    status: str
    message: str
    model: str
    model_ref: str | None = None
    base_url: str
    provider: str | None = None
    provider_label: str | None = None
    models_count: int | None = None
    model_available: bool | None = None
    probe: str | None = None


class ProxyStatusResponse(BaseModel):
    mode: Literal["direct", "single", "pool", "vpn"]
    pool_size: int
    rotation: str
    vpn_enabled: bool
    vpn_mode: str
    proxy_server_set: bool = False
    proxy_list_path: str | None = None
    list_exists: bool = False
    list_count: int = 0
    vpn_endpoint_set: bool = False
    vpn_config_path: str | None = None


class ProxyTestResponse(BaseModel):
    ok: bool
    message: str
    direct_ip: str | None = None
    exit_ip: str | None = None
    proxied: bool = False
    mode: Literal["direct", "single", "pool", "vpn"] = "direct"


class PanelAccessResponse(BaseModel):
    bind_host: str
    bind_port: int
    access_ip: str
    access_port: int
    panel_path: str
    panel_url: str
    copy_text: str
    entry_path: str | None = None
    entrance_url: str | None = None


class StoreInstallLogResponse(BaseModel):
    plugin_id: str
    status: str
    mode: str | None = None
    lines: list[str] = Field(default_factory=list)
    tail: int = 0
