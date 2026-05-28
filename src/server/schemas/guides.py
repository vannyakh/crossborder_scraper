from typing import Literal

from pydantic import BaseModel, Field


class PanelGuideLink(BaseModel):
    label: str
    path: str


class PanelGuideSummary(BaseModel):
    id: str
    title: str
    summary: str
    category: Literal["agent", "scrape", "panel", "integrate"]
    category_label: str
    tool_ids: list[str] = Field(default_factory=list)
    links: list[PanelGuideLink] = Field(default_factory=list)


class PanelGuideCategory(BaseModel):
    id: str
    label: str


class PanelGuideListResponse(BaseModel):
    items: list[PanelGuideSummary]
    categories: list[PanelGuideCategory]


class PanelGuideDetailResponse(PanelGuideSummary):
    body_md: str
    source_path: str
