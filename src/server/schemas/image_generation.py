from typing import Literal

from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    size: Literal["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"] = "1024x1024"
    n: int = Field(default=1, ge=1, le=4)
    quality: Literal["standard", "hd"] | None = None


class GeneratedImageItem(BaseModel):
    path: str
    url: str
    prompt: str
    model: str
    revised_prompt: str | None = None


class ImageGenerateResponse(BaseModel):
    ok: bool
    error: str | None = None
    images: list[GeneratedImageItem] = Field(default_factory=list)


class ImageGenerationStatusResponse(BaseModel):
    ai_image_enabled: bool
    ai_image_model: str
    image_ready: bool
    uploads_dir: str
