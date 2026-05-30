from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

PluginProfileCategory = Literal["model", "memory", "tool", "scraper", "service"]
PluginProfileFieldType = Literal[
    "text",
    "textarea",
    "mono",
    "url",
    "select",
    "toggle",
    "llm_provider",
    "llm_model",
    "source_plugin",
    "variable_key",
]


class PluginProfileSelectOption(BaseModel):
    value: str
    label: str


class PluginProfileField(BaseModel):
    id: str
    key: str
    label: str
    type: PluginProfileFieldType
    required: bool = False
    default: Any | None = None
    placeholder: str | None = None
    hint: str | None = None
    options: list[PluginProfileSelectOption] = Field(default_factory=list)


class PluginProfileTab(BaseModel):
    id: str
    label: str


class PluginProfileSection(BaseModel):
    id: str
    label: str
    tab: str
    fields: list[PluginProfileField] = Field(default_factory=list)


class PluginVariableKey(BaseModel):
    key: str
    label: str
    scope: Literal["project", "shared"] = "project"
    masked: bool = False


class PluginProfile(BaseModel):
    id: str
    label: str
    category: PluginProfileCategory
    plugin_id: str | None = None
    node_kinds: list[str] = Field(default_factory=list)
    slot_index: int | None = None
    tabs: list[PluginProfileTab] = Field(default_factory=list)
    sections: list[PluginProfileSection] = Field(default_factory=list)
    variable_keys: list[PluginVariableKey] = Field(default_factory=list)


class PluginProfileCatalogResponse(BaseModel):
    profiles: list[PluginProfile]
    total: int
