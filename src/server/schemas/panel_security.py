"""Panel security / network configuration schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from server.schemas.network import NetworkAccessStatusResponse


class PanelSecurityUrls(BaseModel):
    entrance: str | None = None
    entrance_access: str | None = None
    login: str | None = None
    local_login: str | None = None
    bare_host_note: str = "http://<host>:<port> returns 404 when security entrance is enabled"


class ServerTimezoneInfo(BaseModel):
    timezone: str = "UTC"
    label: str = "UTC"
    local_time: str = ""
    utc_offset: str = "+00:00"


class TimezoneOption(BaseModel):
    id: str
    label: str


class PanelSecurityStatusResponse(BaseModel):
    security_entrance_enabled: bool
    entry_path: str | None = None
    entry_path_display: str | None = None
    access_key_configured: bool = False
    panel_host: str
    panel_port: int
    external_host: str | None = None
    panel_username: str | None = None
    urls: PanelSecurityUrls
    network: NetworkAccessStatusResponse
    restart_required: bool = False
    server_timezone: ServerTimezoneInfo
    timezone_options: list[TimezoneOption] = Field(default_factory=list)


class PanelSecurityUpdateRequest(BaseModel):
    external_host: str | None = Field(
        default=None,
        description="Public domain or IP for access URLs (empty clears)",
    )
    entry_path: str | None = Field(
        default=None,
        description="8-char hex entrance path, or off/false/disabled to disable",
    )
    regenerate_entry: bool = False
    regenerate_access_key: bool = False
    enable_entrance: bool | None = None
    username: str | None = Field(default=None, min_length=1, max_length=64)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    timezone: str | None = Field(
        default=None,
        description="IANA timezone for cron schedules and server time display",
    )


class PanelSecurityUpdateResponse(BaseModel):
    ok: bool = True
    messages: list[str] = Field(default_factory=list)
    access_key: str | None = Field(
        default=None,
        description="Plain access key when regenerated (show once)",
    )
    status: PanelSecurityStatusResponse
    restart_required: bool = False
