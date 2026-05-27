from typing import Any, Literal

from pydantic import BaseModel, Field


class FirewallStatusResponse(BaseModel):
    installed: bool = False
    active: bool = False
    can_manage: bool = False
    port_allowed: bool = False
    ssh_allowed: bool = False
    summary: str = ""
    port_rule_count: int = 0
    inbound_rule_count: int = 0
    outbound_rule_count: int = 0
    ip_rule_count: int = 0
    forward_rule_count: int = 0
    area_rule_count: int = 0
    group_count: int = 0
    block_icmp: bool = False
    icmp_blocked: bool = False
    config_path: str = ""
    platform: str = ""


class FirewallRuleItem(BaseModel):
    id: str
    ufw_number: int
    protocol: str
    port: str
    source: str
    action: str
    strategy: str = "allow"
    direction: Literal["inbound", "outbound"] = "inbound"
    remark: str = ""
    group_id: str | None = None
    group_label: str | None = None
    listening: bool | None = None
    status_label: str = ""
    managed: bool = False
    ipv6: bool = False


class FirewallRuleListResponse(BaseModel):
    items: list[FirewallRuleItem]
    total: int


class FirewallGroupItem(BaseModel):
    id: str
    label: str
    description: str = ""
    rule_count: int = 0


class FirewallGroupListResponse(BaseModel):
    items: list[FirewallGroupItem]
    total: int


class FirewallRuleCreateRequest(BaseModel):
    protocol: Literal["tcp", "udp", "any"] = "tcp"
    port: str = Field(..., min_length=1, max_length=64)
    source: str = Field(default="0.0.0.0/0", max_length=64)
    action: Literal["allow", "deny"] = "allow"
    direction: Literal["inbound", "outbound"] = "inbound"
    remark: str = Field(default="", max_length=200)
    group_id: str | None = Field(default=None, max_length=32)


class FirewallToggleRequest(BaseModel):
    enabled: bool


class FirewallIcmpRequest(BaseModel):
    block: bool


class FirewallActionResponse(BaseModel):
    ok: bool
    message: str = ""
    messages: list[str] = Field(default_factory=list)
    status: FirewallStatusResponse | None = None
    rules: FirewallRuleListResponse | None = None


class FirewallGroupUpsertRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=32, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    label: str = Field(..., min_length=1, max_length=80)
    description: str = Field(default="", max_length=200)


class FirewallImportRequest(BaseModel):
    version: int = 1
    block_icmp: bool | None = None
    groups: list[dict[str, Any]] | None = None
    rules_meta: dict[str, Any] | None = None
    rules: dict[str, Any] | None = None


class FirewallExportResponse(BaseModel):
    version: int = 1
    block_icmp: bool = False
    groups: list[dict[str, Any]] = Field(default_factory=list)
    rules_meta: dict[str, Any] = Field(default_factory=dict)
    live_rules: list[dict[str, Any]] = Field(default_factory=list)
