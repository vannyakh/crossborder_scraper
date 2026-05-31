from typing import Literal

from pydantic import BaseModel, Field

ModuleKind = Literal["store_service", "source_plugin", "skill"]


class ModuleProfileLink(BaseModel):
    label: str
    path: str


class ModuleProfileSummary(BaseModel):
    id: str
    kind: ModuleKind | str
    name: str
    category: str
    category_label: str
    icon: str = "server"
    summary: str = ""
    tags: list[str] = Field(default_factory=list)
    links: list[ModuleProfileLink] = Field(default_factory=list)
    has_guide: bool = False
    source_path: str = ""


class ModuleProfileCategory(BaseModel):
    id: str
    label: str
    kinds: list[str] = Field(default_factory=list)


class ModuleProfileMetaResponse(BaseModel):
    modules: list[ModuleProfileSummary]
    categories: list[ModuleProfileCategory]
    icons: dict[str, str] = Field(default_factory=dict)
    total: int


class ModuleProfileDetailResponse(ModuleProfileSummary):
    body_md: str = ""
