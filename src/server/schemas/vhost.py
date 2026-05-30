from typing import Literal

from pydantic import BaseModel, Field


class VhostStatusResponse(BaseModel):
    installed: bool = False
    can_manage: bool = False
    certbot_installed: bool = False
    sites_available_dir: str = ""
    sites_enabled_dir: str = ""
    site_count: int = 0
    enabled_count: int = 0
    ssl_count: int = 0
    unhealthy_count: int = 0
    panel_port: int = 8787
    panel_upstream_healthy: bool | None = None
    config_path: str = ""
    platform: str = ""


class VhostSiteItem(BaseModel):
    id: str
    filename: str
    config_path: str
    server_names: list[str] = Field(default_factory=list)
    listen_ports: list[str] = Field(default_factory=list)
    upstream_port: int | None = None
    upstream_healthy: bool | None = None
    ssl: bool = False
    enabled: bool = False
    managed: bool = False
    remark: str = ""
    purpose: Literal["panel", "proxy", "other"] = "other"


class VhostSiteListResponse(BaseModel):
    items: list[VhostSiteItem]
    total: int


class VhostSiteCreateRequest(BaseModel):
    domain: str = Field(..., min_length=1, max_length=253)
    upstream_port: int = Field(default=8787, ge=1, le=65535)
    ssl: bool = False
    certbot: bool = False
    remark: str = Field(default="", max_length=200)
    purpose: Literal["panel", "proxy", "other"] = "panel"


class VhostSiteToggleRequest(BaseModel):
    enabled: bool


class VhostCertbotRequest(BaseModel):
    domain: str = Field(..., min_length=1, max_length=253)


class VhostActionResponse(BaseModel):
    ok: bool
    message: str = ""
    messages: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    status: VhostStatusResponse | None = None
    sites: VhostSiteListResponse | None = None
    login_url: str | None = None
