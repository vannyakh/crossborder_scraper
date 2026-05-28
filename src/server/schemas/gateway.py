from typing import Any, Literal

from pydantic import BaseModel, Field

from .common import StatsResponse


class GatewayAgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    prompt_id: str | None = None
    session_id: str | None = Field(
        default=None,
        description="Panel chat session id — loads multi-turn history and persists the turn",
    )
    skill_ids: list[str] | None = Field(
        default=None,
        description="Optional skill ids; omit to use config/agent_skills.yaml enabled set",
    )


class GatewayAgentResponse(BaseModel):
    ok: bool
    message: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    model: str | None = None
    provider: str | None = None
    model_ref: str | None = None
    prompt_id: str | None = None
    session_id: str | None = None
    skill_ids: list[str] = Field(default_factory=list)
    rule_ids: list[str] = Field(default_factory=list)
    channel_id: str | None = None
    platform_chat_id: str | None = None


class AgentRuleInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    category: str = "general"
    priority: int = 50
    enabled: bool = False
    kind: Literal["builtin", "custom"] = "builtin"
    path: str = ""
    body_preview: str = ""


class AgentRuleDetail(AgentRuleInfo):
    body: str = ""


class AgentRuleListResponse(BaseModel):
    items: list[AgentRuleInfo]
    total: int
    enabled: list[str] = Field(default_factory=list)


class AgentRuleEnableRequest(BaseModel):
    enabled: list[str] = Field(default_factory=list)


class AgentRuleCreateRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    category: Literal["safety", "behavior", "tools", "output", "general"] = "general"
    body: str = Field(..., min_length=1, max_length=12000)
    priority: int = Field(default=50, ge=0, le=999)


class AgentRuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    category: Literal["safety", "behavior", "tools", "output", "general"] | None = None
    body: str | None = Field(default=None, min_length=1, max_length=12000)
    priority: int | None = Field(default=None, ge=0, le=999)


class AgentRuleDeleteResponse(BaseModel):
    ok: bool = True
    rule_id: str
    removed: bool = True


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
    source: Literal["builtin", "installed", "registry"] = "builtin"
    registry_slug: str = ""
    registry_url: str = ""
    installed_at: str = ""
    registry_version: str = ""


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


class SkillRegistryItem(BaseModel):
    slug: str
    name: str
    description: str = ""
    version: str = "1.0.0"
    kind: Literal["skill", "plugin"] = "skill"
    family: str = "skill"
    owner_handle: str = ""
    downloads: int = 0
    stars: int = 0
    executes_code: bool = False
    is_official: bool = False
    registry_url: str = ""
    installed: bool = False
    enabled: bool = False


class SkillRegistryListResponse(BaseModel):
    items: list[SkillRegistryItem]
    next_cursor: str | None = None
    registry_url: str = ""


class SkillRegistryInstallRequest(BaseModel):
    slug: str = Field(..., min_length=1, max_length=120)
    version: str | None = Field(default=None, max_length=40)
    replace: bool = False


class SkillRegistryDetailResponse(BaseModel):
    slug: str
    name: str
    description: str = ""
    version: str = "1.0.0"
    changelog: str = ""
    license: str = ""
    owner_handle: str = ""
    registry_url: str = ""
    stats: dict[str, Any] = Field(default_factory=dict)
    installed: bool = False
    enabled: bool = False
    local_version: str = ""


class GatewayPromptInfo(BaseModel):
    id: str
    label: str
    path: str
    recommended: bool = False
    kind: Literal["role", "task"] = "task"


class AgentChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: str | None = None
    ok: bool | None = None
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    model_ref: str | None = None
    kind: Literal["session"] | None = None


class AgentChatSession(BaseModel):
    id: str
    label: str
    display_label: str | None = None
    channel_id: str = "panel"
    platform_chat_id: str | None = None
    platform_chat_title: str | None = None
    platform_chat_kind: Literal["direct", "group", "unknown"] | None = None
    message_count: int = 0
    prompt_id: str = "gateway_agent"
    created_at: str
    updated_at: str
    messages: list[AgentChatMessage] = Field(default_factory=list)


class AgentChatSessionChannelSummary(BaseModel):
    channel_id: str
    label: str
    count: int


class AgentChatSessionListResponse(BaseModel):
    items: list[AgentChatSession]
    total: int
    channels: list[AgentChatSessionChannelSummary] = Field(default_factory=list)


class AgentChatSessionCreateRequest(BaseModel):
    label: str | None = Field(default=None, max_length=80)
    prompt_id: str | None = None
    channel_id: str | None = Field(default="panel", max_length=32)
    platform_chat_id: str | None = Field(default=None, max_length=64)


class AgentChatSessionUpdateRequest(BaseModel):
    label: str | None = Field(default=None, max_length=80)
    prompt_id: str | None = None


class GatewayPromptListResponse(BaseModel):
    items: list[GatewayPromptInfo]


class AgentSchedule(BaseModel):
    id: str
    name: str
    enabled: bool = True
    cron: str
    prompt_id: str = "gateway_agent"
    message: str
    notify_telegram: bool = False
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
    notify_telegram: bool = False


class AgentScheduleUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    cron: str | None = None
    prompt_id: str | None = None
    message: str | None = None
    notify_telegram: bool | None = None


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


class PanelUpdateStatusResponse(BaseModel):
    current_version: str
    latest_version: str | None = None
    update_available: bool = False
    release_url: str | None = None
    release_notes: str | None = None
    source: str = "none"
    git_commits_behind: int = 0
    git_branch: str | None = None
    check_error: str | None = None


class PanelUpdateApplyRequest(BaseModel):
    pull: bool = True
    browser: bool = True
    restart: bool = True
    branch: str | None = None


class PanelUpdateApplyResponse(BaseModel):
    ok: bool
    steps: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    runtime: str = "none"
    restarting: bool = False
    current_version: str
    latest_version: str | None = None
    update_available: bool = False


class TelegramChannelConfig(BaseModel):
    enabled: bool = False
    bot_token: str | None = None
    bot_token_set: bool = False
    bot_token_masked: str | None = None
    control_chat_ids: list[int] = Field(default_factory=list)
    allow_any_chat: bool = False
    prompt_id: str = "gateway_agent"
    max_reply_chars: int = Field(default=3500, ge=500, le=8000)


class TelegramChannelUpdate(BaseModel):
    enabled: bool | None = None
    bot_token: str | None = None
    control_chat_ids: list[int] | None = None
    allow_any_chat: bool | None = None
    prompt_id: str | None = None
    max_reply_chars: int | None = Field(default=None, ge=500, le=8000)


class IntegrateChannelField(BaseModel):
    key: str
    type: str
    label: str
    placeholder: str = ""
    helper: str = ""


class IntegrateChannelSummary(BaseModel):
    id: str
    label: str
    description: str = ""
    runner: Literal["live", "stored"] = "stored"
    configured: bool = False
    enabled: bool = False
    runtime_active: bool = False


class IntegrateChannelListResponse(BaseModel):
    items: list[IntegrateChannelSummary]
    total: int


class IntegrateChannelDetailResponse(IntegrateChannelSummary):
    setup_steps: list[str] = Field(default_factory=list)
    setup_guide_md: str = ""
    setup_guide_path: str = ""
    fields: list[IntegrateChannelField] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrateChannelUpdateRequest(BaseModel):
    updates: dict[str, Any] = Field(default_factory=dict)


class IntegrateChannelReloadResponse(BaseModel):
    ok: bool = True
    channel_id: str
    runtime_active: bool = False
    message: str = ""
    configured: bool = False
    enabled: bool = False


class GatewayStatusResponse(BaseModel):
    service: str
    version: str
    update_available: bool = False
    latest_version: str | None = None
    control_plane: str
    clients: list[str]
    tools_count: int
    skills_count: int = 0
    enabled_skills_count: int = 0
    rules_count: int = 0
    enabled_rules_count: int = 0
    workflows_count: int
    schedules_count: int = 0
    enabled_schedules_count: int = 0
    recent_failed_runs: int = 0
    runtime: dict[str, Any]
    telegram: dict[str, Any] = Field(default_factory=dict)


class ServiceGatewaySummary(BaseModel):
    service: str
    version: str
    update_available: bool = False
    latest_version: str | None = None
    control_plane: str
    clients: list[str]
    tools_count: int
    skills_count: int = 0
    enabled_skills_count: int = 0
    rules_count: int = 0
    enabled_rules_count: int = 0
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
