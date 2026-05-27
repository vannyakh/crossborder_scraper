from typing import Any

from pydantic import BaseModel, Field


class ServiceLogEntry(BaseModel):
    id: str
    category: str
    user: str
    operation_type: str
    details: str
    created_at: str
    meta: dict[str, Any] = Field(default_factory=dict)


class ServiceLogListResponse(BaseModel):
    category: str
    items: list[ServiceLogEntry]
    total: int
    limit: int
    offset: int
