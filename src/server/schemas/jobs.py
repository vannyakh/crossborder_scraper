from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from core.engine.jobs import BatchReport, JobResult

__all__ = [
    "BatchDetailResponse",
    "BatchListResponse",
    "BatchReport",
    "BatchSummary",
    "JobResult",
    "ScrapeSingleRequest",
    "ScrapeSingleResponse",
    "StatusResponse",
    "SubmitRequest",
    "SubmitResponse",
]


class SubmitRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1)
    workers: int | None = None
    use_ai: bool | None = None
    save: bool = True
    session_id: str | None = None


class SubmitResponse(BaseModel):
    batch_id: str
    total: int
    status: str = "accepted"


class StatusResponse(BaseModel):
    started_at: datetime
    running: bool
    completed: int
    total: int
    success: int
    failed: int
    status: str = "running"


class BatchSummary(BaseModel):
    batch_id: str
    status: str
    total: int
    completed: int
    success: int
    failed: int
    workers: int | None
    use_ai: bool
    save_results: bool
    started_at: str
    finished_at: str | None


class BatchListResponse(BaseModel):
    items: list[BatchSummary]
    total: int
    limit: int
    offset: int


class BatchDetailResponse(BatchSummary):
    results: list[dict[str, Any]]


class ScrapeSingleRequest(BaseModel):
    url: str
    use_ai: bool | None = None
    save: bool = True
    session_id: str | None = None


class ScrapeSingleResponse(BaseModel):
    job_id: str
    status: Literal["success", "failed"]
    product_id: int | None = None
    result: JobResult | None = None
    error: str | None = None
