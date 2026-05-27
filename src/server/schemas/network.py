"""Network access / firewall schemas for the settings panel."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class NetworkAccessCheck(BaseModel):
    id: str
    label: str
    ok: bool | None = None
    detail: str = ""


class HostFirewallStatus(BaseModel):
    installed: bool = False
    active: bool = False
    port_allowed: bool = False
    ssh_allowed: bool = False
    summary: str = ""


class CloudSecurityRule(BaseModel):
    direction: str = "inbound"
    protocol: str = "TCP"
    port: str
    source: str = "0.0.0.0/0"
    action: str = "allow"
    description: str = "Crossborder panel"


class NetworkAccessStatusResponse(BaseModel):
    port: int
    bind_host: str
    external_host: str | None = None
    listening: list[str] = Field(default_factory=list)
    public_bind: bool = False
    local_health: bool = False
    ufw: HostFirewallStatus
    firewalld: HostFirewallStatus
    cloud_rule: CloudSecurityRule
    cloud_steps: list[str] = Field(default_factory=list)
    checks: list[NetworkAccessCheck]
    login_urls: dict[str, str | None] = Field(default_factory=dict)
    can_manage_host_firewall: bool = False
    platform: str = ""


class NetworkAccessApplyRequest(BaseModel):
    enable_ufw: bool = False
    port: int | None = None


class NetworkAccessApplyResponse(BaseModel):
    ok: bool
    messages: list[str] = Field(default_factory=list)
    status: NetworkAccessStatusResponse


class NetworkAccessSetupRequest(BaseModel):
    ensure_bind: bool = True
    enable_ufw: bool = True
    open_firewall: bool = True
    persist_external: bool = True
    port: int | None = None


class NetworkAccessSetupResponse(BaseModel):
    ok: bool
    messages: list[str] = Field(default_factory=list)
    status: NetworkAccessStatusResponse
    restart_required: bool = False
