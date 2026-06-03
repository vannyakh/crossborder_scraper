"""Panel + gateway video generation service."""

from __future__ import annotations

from typing import Any

from config import Settings
from core.ai.video_client import GeneratedVideo, VideoGenerationClient, VideoGenerationError
from core.paths import uploads_dir
from server.services.context import AppContext, get_context


class VideoGenerationService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    @property
    def settings(self) -> Settings:
        return self._ctx.settings

    def get_status(self) -> dict[str, Any]:
        client = VideoGenerationClient(self.settings)
        return {
            "ai_video_enabled": self.settings.ai_video_enabled,
            "ai_video_model": client.model,
            "video_ready": client.enabled,
            "ai_video_timeout_seconds": self.settings.ai_video_timeout_seconds,
            "uploads_dir": str(uploads_dir()),
        }

    async def generate(
        self,
        prompt: str,
        *,
        size: str = "1280x720",
        seconds: str = "8",
    ) -> dict[str, Any]:
        client = VideoGenerationClient(self.settings)
        try:
            video = await client.generate(prompt, size=size, seconds=seconds)
        except VideoGenerationError as exc:
            return {"ok": False, "error": str(exc)}
        return {"ok": True, "videos": [_video_payload(video)]}


def _video_payload(video: GeneratedVideo) -> dict[str, Any]:
    return {
        "path": video.relative_path,
        "url": video.url_path,
        "prompt": video.prompt,
        "model": video.model,
        "seconds": video.seconds,
        "size": video.size,
        "job_id": video.job_id,
    }


_service: VideoGenerationService | None = None


def get_video_generation_service() -> VideoGenerationService:
    global _service
    if _service is None:
        _service = VideoGenerationService()
    return _service
