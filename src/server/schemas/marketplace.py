from typing import Any, Literal

from pydantic import BaseModel, Field


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
