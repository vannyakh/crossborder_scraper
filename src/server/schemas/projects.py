from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ProjectEnvironment = Literal["production", "staging", "development"]
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


class ProjectFlowUpdateRequest(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    client_id: str | None = Field(default=None, max_length=64)
