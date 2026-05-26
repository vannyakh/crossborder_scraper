from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from config import TargetMarketplace
from core.engine.jobs import BatchReport, JobResult


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


class ProductSummary(BaseModel):
    id: int
    source: str
    source_product_id: str
    source_url: str
    title: str
    created_at: str
    updated_at: str


class ProductListResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    limit: int
    offset: int


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


class FileEntry(BaseModel):
    path: str
    name: str
    size_bytes: int
    modified_at: str
    kind: str


class FileListResponse(BaseModel):
    items: list[FileEntry]
    output_dir: str


class StatsResponse(BaseModel):
    products: int
    batches: int
    output_files: int
    running_batches: int
    cookies_sessions: dict[str, list[str]]


class ExportRequest(BaseModel):
    product_id: int | None = None
    url: str | None = None
    marketplace: TargetMarketplace
    dry_run: bool = True


class ExportResponse(BaseModel):
    marketplace: str
    dry_run: bool
    listing: dict[str, Any]
    published: bool = False
    api_response: dict[str, Any] | None = None


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


class MessageResponse(BaseModel):
    message: str
    batch_id: str | None = None


# Re-export for routers
__all__ = [
    "BatchDetailResponse",
    "BatchListResponse",
    "BatchReport",
    "ExportRequest",
    "ExportResponse",
    "FileListResponse",
    "MessageResponse",
    "ProductListResponse",
    "ScrapeSingleRequest",
    "ScrapeSingleResponse",
    "StatsResponse",
    "StatusResponse",
    "SubmitRequest",
    "SubmitResponse",
]
