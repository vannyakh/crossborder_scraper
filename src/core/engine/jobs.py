import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from core.models import ScrapedProduct


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScrapeJob(BaseModel):
    """Single scrape task submitted to the engine."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    url: str
    site_key: str | None = None  # auto-detect if None
    proxy_index: int | None = None
    session_id: str | None = None  # cookie session name
    use_ai: bool | None = None  # None = use engine default
    priority: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JobResult(BaseModel):
    job_id: str
    url: str
    status: JobStatus
    product: ScrapedProduct | None = None
    error: str | None = None
    duration_seconds: float = 0.0
    worker_id: int | None = None
    proxy_used: str | None = None
    ai_used: bool = False
    finished_at: datetime = Field(default_factory=datetime.utcnow)


class BatchReport(BaseModel):
    batch_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    total: int = 0
    success: int = 0
    failed: int = 0
    results: list[JobResult] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None

    @property
    def success_rate(self) -> float:
        return (self.success / self.total * 100) if self.total else 0.0
