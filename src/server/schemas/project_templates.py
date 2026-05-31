from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from server.schemas.projects import ProjectDetail, ProjectEnvironment


class ProjectTemplateSummary(BaseModel):
    id: str
    name: str
    summary: str
    category: str
    category_label: str
    tags: list[str] = Field(default_factory=list)
    author: str = "Cross-Border"
    featured: bool = False
    node_count: int = 0
    preview_nodes: list[dict[str, Any]] = Field(default_factory=list)
    preview_edges: list[dict[str, Any]] = Field(default_factory=list)
    source_path: str = ""


class ProjectTemplateCategory(BaseModel):
    id: str
    label: str
    count: int = 0


class ProjectTemplateListResponse(BaseModel):
    items: list[ProjectTemplateSummary]
    categories: list[ProjectTemplateCategory]
    total: int


class ProjectTemplateDetailResponse(ProjectTemplateSummary):
    description: str = ""
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)


class ProjectTemplateUseRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    environment: ProjectEnvironment = "development"
    description: str | None = Field(default=None, max_length=500)


class ProjectTemplateUseResponse(BaseModel):
    template_id: str
    template_name: str
    project: ProjectDetail
