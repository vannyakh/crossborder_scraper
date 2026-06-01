from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ProjectEnvironment = Literal["production", "staging", "development"]
ProjectVisibility = Literal["private", "workspace"]
VariableScope = Literal["project", "shared"]
ProjectNodeKind = Literal[
    "github",
    "redis",
    "postgres",
    "scrape",
    "agent",
    "webhook",
    "schedule",
    "export",
    "condition",
    "notify",
    "sticky",
]
ProjectNodeRole = Literal["trigger", "action", "agent", "config", "note"]
ProjectNodeStatus = Literal["online", "offline"]
ProjectEdgeKind = Literal["main", "config"]
AgentSlotIndex = Literal[0, 1, 2]


class ProjectNode(BaseModel):
    model_config = {"extra": "allow"}

    id: str
    kind: ProjectNodeKind
    label: str
    x: float
    y: float
    role: ProjectNodeRole | None = None
    subtitle: str | None = None
    host: str | None = None
    status: ProjectNodeStatus | None = None
    detail: str | None = None
    note_body: str | None = Field(default=None, alias="noteBody")
    note_width: float | None = Field(default=None, alias="noteWidth")
    note_height: float | None = Field(default=None, alias="noteHeight")
    note_color: str | None = Field(default=None, alias="noteColor")
    agent_prompt: str | None = Field(default=None, alias="agentPrompt")
    plugin_id: str | None = Field(default=None, alias="pluginId")
    plugin_profile: str | None = Field(default=None, alias="pluginProfile")
    options: dict[str, Any] | None = None


class ProjectEdge(BaseModel):
    id: str
    from_: str = Field(alias="from")
    to: str
    kind: ProjectEdgeKind | None = None
    slot_index: AgentSlotIndex | None = Field(default=None, alias="slotIndex")

    model_config = {"populate_by_name": True}


class ProjectSummary(BaseModel):
    id: str
    name: str
    environment: ProjectEnvironment
    services_online: int = 0
    services_total: int = 0
    updated_at: str
    description: str | None = None
    preview_nodes: list[dict[str, Any]] = Field(default_factory=list)
    preview_edges: list[dict[str, Any]] = Field(default_factory=list)


class ProjectDetail(ProjectSummary):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    flow_revision: int = 0


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]
    total: int


class ProjectPresenceGuest(BaseModel):
    client_id: str
    username: str
    selected_node_id: str | None = None


class ProjectPresenceItem(BaseModel):
    project_id: str
    guests: list[ProjectPresenceGuest] = Field(default_factory=list)


class ProjectPresenceResponse(BaseModel):
    items: list[ProjectPresenceItem] = Field(default_factory=list)


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    environment: ProjectEnvironment = "development"
    description: str | None = Field(default=None, max_length=500)


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    environment: ProjectEnvironment | None = None
    description: str | None = Field(default=None, max_length=500)


class ProjectSettingsGeneral(BaseModel):
    name: str
    description: str = ""
    environment: ProjectEnvironment
    visibility: ProjectVisibility = "private"


class ProjectSettingsUsage(BaseModel):
    services_online: int = 0
    services_total: int = 0
    nodes: int = 0
    environment: ProjectEnvironment = "development"
    flow_revision: int = 0
    updated_at: str = ""


class ProjectSettingsVariable(BaseModel):
    key: str
    scope: VariableScope = "project"
    masked: bool = False
    value: str = ""


class ProjectSettingsWebhook(BaseModel):
    node_id: str
    label: str
    subtitle: str | None = None
    kind: str
    status: str = "online"


class ProjectSettingsMember(BaseModel):
    id: str
    name: str
    role: str
    username: str | None = None


class ProjectSettingsToken(BaseModel):
    id: str
    label: str
    prefix: str
    created_at: str


class ProjectSettingsIntegration(BaseModel):
    id: str
    label: str
    linked: bool = False
    configured: bool = False
    runtime_active: bool = False


class ProjectSettingsResponse(BaseModel):
    project_id: str
    general: ProjectSettingsGeneral
    usage: ProjectSettingsUsage
    variables: list[ProjectSettingsVariable] = Field(default_factory=list)
    webhooks: list[ProjectSettingsWebhook] = Field(default_factory=list)
    members: list[ProjectSettingsMember] = Field(default_factory=list)
    tokens: list[ProjectSettingsToken] = Field(default_factory=list)
    integrations: list[ProjectSettingsIntegration] = Field(default_factory=list)
    tokens_preview: bool = False


class ProjectSettingsPatchRequest(BaseModel):
    visibility: ProjectVisibility | None = None
    variables: list[ProjectSettingsVariable] | None = None


class ProjectTokenCreateRequest(BaseModel):
    label: str = Field(default="API token", min_length=1, max_length=120)


class ProjectTokenCreateResponse(BaseModel):
    token: ProjectSettingsToken
    secret: str
    message: str = "Copy this token now — it will not be shown again."


class ProjectFlowUpdateRequest(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    client_id: str | None = Field(default=None, max_length=64)


class ProjectRuntimeServiceSeries(BaseModel):
    id: str
    name: str
    color: str
    values: list[float] = Field(default_factory=list)


class ProjectRuntimeMetricsBlock(BaseModel):
    labels: list[str] = Field(default_factory=list)
    cpu: list[ProjectRuntimeServiceSeries] = Field(default_factory=list)
    memory: list[ProjectRuntimeServiceSeries] = Field(default_factory=list)
    network: list[ProjectRuntimeServiceSeries] = Field(default_factory=list)
    disk: list[ProjectRuntimeServiceSeries] = Field(default_factory=list)


class ProjectRuntimeState(BaseModel):
    services_online: int = 0
    services_total: int = 0
    nodes: int = 0
    flow_revision: int = 0
    host_cpu_percent: float = 0.0
    host_memory_percent: float = 0.0
    host_disk_percent: float = 0.0
    collected_at: str = ""


class ProjectRuntimeRecentLog(BaseModel):
    id: str
    level: str
    message: str
    node_label: str | None = None
    created_at: str


class ProjectRuntimeResponse(BaseModel):
    project_id: str
    live: bool = True
    simulated: bool = False
    state: ProjectRuntimeState
    metrics: ProjectRuntimeMetricsBlock
    recent_logs: list[ProjectRuntimeRecentLog] = Field(default_factory=list)


# --- Flow run / execution ---

ProjectStepStatus = Literal["pending", "running", "success", "failed", "skipped"]
ProjectRunStatus = Literal["pending", "running", "completed", "failed", "stopped"]


class ProjectRunRequest(BaseModel):
    """Body for POST /projects/{id}/run. Omit node_id to run the full flow."""

    node_id: str | None = Field(default=None, description="Run a single node if provided.")
    triggered_by: str = Field(default="manual", max_length=120)


class ProjectStepResult(BaseModel):
    node_id: str
    node_label: str
    kind: str
    phase: str = "main"
    status: ProjectStepStatus = "pending"
    duration_ms: int = 0
    output: str | None = None
    error: str | None = None
    started_at: str | None = None
    finished_at: str | None = None


class ProjectRunRecord(BaseModel):
    id: str
    project_id: str
    status: ProjectRunStatus = "pending"
    trigger: str = "manual"
    triggered_by: str = "system"
    node_id: str | None = None
    steps: list[ProjectStepResult] = Field(default_factory=list)
    started_at: str = ""
    finished_at: str | None = None
    error: str | None = None


class ProjectRunResponse(BaseModel):
    """Immediate response from POST /run before steps complete."""

    run_id: str
    status: ProjectRunStatus
    project_id: str
    started_at: str


class ProjectRunListResponse(BaseModel):
    items: list[ProjectRunRecord] = Field(default_factory=list)
    total: int = 0
