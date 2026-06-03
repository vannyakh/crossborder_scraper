from typing import Literal

from pydantic import BaseModel, Field


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    size: Literal["720x1280", "1280x720", "1024x1792", "1792x1024"] = "1280x720"
    seconds: Literal["4", "8", "12"] = "8"


class GeneratedVideoItem(BaseModel):
    path: str
    url: str
    prompt: str
    model: str
    seconds: str
    size: str
    job_id: str


class VideoGenerateResponse(BaseModel):
    ok: bool
    error: str | None = None
    videos: list[GeneratedVideoItem] = Field(default_factory=list)


class VideoGenerationStatusResponse(BaseModel):
    ai_video_enabled: bool
    ai_video_model: str
    video_ready: bool
    ai_video_timeout_seconds: float
    uploads_dir: str
