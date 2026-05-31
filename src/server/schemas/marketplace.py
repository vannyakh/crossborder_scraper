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
    supports_native: bool = False
    available_versions: list[str] = Field(default_factory=list)
    default_version: str = ""
    systemd_unit: str = ""
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
    has_guide: bool = False
    guide_summary: str = ""
    category_label: str = ""
    icon: str = ""
    module_kind: str | None = None


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
    native_driver_available: bool = False
    platform: str = "unknown"
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
    mode: Literal["native", "docker"] = "native"
    port: int | None = Field(default=None, ge=1, le=65535)
    version: str | None = None


class StoreConnectRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int | None = None
    username: str | None = None
    password: str | None = None
    database: str | None = None
    management_port: int | None = None


class StoreUpdateConfigRequest(BaseModel):
    host: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    username: str | None = None
    password: str | None = None
    database: str | None = None
    management_port: int | None = Field(default=None, ge=1, le=65535)
    regenerate_password: bool = False


class StorePluginCredentialsResponse(BaseModel):
    plugin_id: str
    mode: str | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    database: str | None = None
    password: str | None = None
    management_port: int | None = None
    has_password: bool = False


class StoreDatabaseEntry(BaseModel):
    name: str
    username: str
    password: str
    charset: str = "utf8mb4"
    access: str = "local"
    created_at: str | None = None
    legacy: bool = False


class StoreDatabaseCreateItem(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    username: str | None = Field(default=None, max_length=64)
    password: str | None = Field(default=None, max_length=128)
    charset: str = "utf8mb4"
    access: str = Field(default="local", pattern="^(local|remote)$")


class StoreCreateDatabasesRequest(BaseModel):
    databases: list[StoreDatabaseCreateItem] = Field(min_length=1, max_length=20)


class StoreDatabasePatchRequest(BaseModel):
    password: str | None = Field(default=None, max_length=128)
    access: str | None = Field(default=None, pattern="^(local|remote)$")
    regenerate_password: bool = False


class DatabaseTableInfo(BaseModel):
    name: str
    engine: str | None = None
    row_type: str = "BASE TABLE"
    rows: int | None = None
    size_bytes: int | None = None
    collation: str | None = None


class DatabaseQuerySuggestion(BaseModel):
    label: str
    sql: str


class DatabaseTablesResponse(BaseModel):
    plugin_id: str
    database: str
    items: list[DatabaseTableInfo]
    total: int
    suggestions: list[DatabaseQuerySuggestion] = Field(default_factory=list)
    syntax_hints: list[str] = Field(default_factory=list)


class DatabaseQueryRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=8000)
    limit: int = Field(default=100, ge=1, le=500)


class DatabaseQueryResponse(BaseModel):
    ok: bool = True
    error: str | None = None
    columns: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    row_count: int = 0
    rows_affected: int | None = None
    elapsed_ms: float | None = None
    message: str | None = None
    sql_executed: str | None = None


class DatabaseSqlCompleteResponse(BaseModel):
    keywords: list[str] = Field(default_factory=list)
    types: list[str] = Field(default_factory=list)
    identifiers: list[str] = Field(default_factory=list)


class DatabaseColumnInfo(BaseModel):
    name: str
    data_type: str
    nullable: bool = True
    default: str | None = None
    primary: bool = False


class DatabaseColumnsResponse(BaseModel):
    plugin_id: str
    database: str
    table: str
    items: list[DatabaseColumnInfo]


class DatabaseCreateTableColumn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    type: str = Field(min_length=1, max_length=64)
    nullable: bool = True
    primary: bool = False
    auto_increment: bool = False
    default: str | None = Field(default=None, max_length=128)


class DatabaseCreateTableRequest(BaseModel):
    table_name: str = Field(min_length=1, max_length=64)
    columns: list[DatabaseCreateTableColumn] = Field(min_length=1, max_length=32)


class DatabaseAddColumnRequest(BaseModel):
    column_name: str = Field(min_length=1, max_length=64)
    column_type: str = Field(min_length=1, max_length=64)
    nullable: bool = True
    default: str | None = Field(default=None, max_length=128)


class DatabaseInsertRowRequest(BaseModel):
    values: dict[str, Any] = Field(min_length=1)


class DatabaseActionResponse(BaseModel):
    ok: bool = True
    message: str | None = None
    table: str | None = None


class StoreDatabaseConnectionView(BaseModel):
    host: str = "127.0.0.1"
    port: int | None = None
    username: str | None = None
    database: str | None = None
    password_set: bool = False
    mode: str | None = None
    container_name: str | None = None
    status: str | None = None


class DatabaseProviderInfo(BaseModel):
    id: str
    label: str
    category: str
    default_port: int = 0
    supports_docker: bool = False
    supports_external: bool = False
    supports_native: bool = False
    supports_logical_create: bool = False
    supports_managed_connection: bool = True
    installed: bool = False
    status: str = "not_installed"
    mode: str | None = None
    default_version: str | None = None
    available_versions: list[str] = Field(default_factory=list)
    host_detected_version: str | None = None


class DatabaseProvidersResponse(BaseModel):
    items: list[DatabaseProviderInfo]
    total: int


class DatabaseInstallVersionOption(BaseModel):
    id: str
    label: str
    docker_image: str | None = None
    native_supported: bool = False
    recommended: bool = False


class DatabaseInstallOptionsResponse(BaseModel):
    plugin_id: str
    product: str
    label: str
    description: str = ""
    platform: str = "unknown"
    default_port: int = 0
    default_version: str = ""
    supports_docker: bool = False
    supports_native: bool = False
    supports_external: bool = False
    docker_available: bool = False
    native_available: bool = False
    host_detected_version: str | None = None
    docker_versions: list[DatabaseInstallVersionOption] = Field(default_factory=list)
    native_versions: list[DatabaseInstallVersionOption] = Field(default_factory=list)


class StoreManagedDatabaseResponse(BaseModel):
    """Panel-managed database view — logical DB rows plus connection summary."""

    plugin_id: str
    managed: StoreDatabaseEntry | None = None
    items: list[StoreDatabaseEntry] = Field(default_factory=list)
    total: int = 0
    connection: StoreDatabaseConnectionView
    supports_create: bool = False
    extra_logical_count: int = 0
    supports_optimize: bool = False
    supports_permission: bool = False
    supports_inspect: bool = False


class StoreDatabaseListResponse(BaseModel):
    """@deprecated Use StoreManagedDatabaseResponse; kept for OpenAPI compatibility."""

    plugin_id: str
    items: list[StoreDatabaseEntry]
    total: int
    supports_create: bool = False
