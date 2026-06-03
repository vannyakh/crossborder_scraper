"""OpenAI Sora-style video generation for the gateway agent."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import httpx

from config import Settings
from config.llm_providers import get_provider
from core.ai.llm_client import format_llm_http_error, resolve_llm_config
from core.paths import uploads_dir

VideoSize = Literal["720x1280", "1280x720", "1024x1792", "1792x1024"]
VideoSeconds = Literal["4", "8", "12"]

DEFAULT_VIDEO_MODELS: dict[str, str] = {
    "openai": "sora-2",
    "google": "",
    "anthropic": "",
    "ollama": "",
    "qwen": "",
    "custom": "sora-2",
}

_POLL_INTERVAL_SEC = 5.0
_TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})


@dataclass(frozen=True)
class GeneratedVideo:
    path: Path
    relative_path: str
    url_path: str
    prompt: str
    model: str
    seconds: str
    size: str
    job_id: str


class VideoGenerationError(Exception):
    """Video provider returned an error or the panel is not configured."""


def default_video_model(provider_id: str) -> str:
    return DEFAULT_VIDEO_MODELS.get(provider_id, "sora-2")


def video_generation_ready(settings: Settings) -> bool:
    if not settings.ai_enabled or not settings.ai_video_enabled:
        return False
    cfg = resolve_llm_config(settings)
    if cfg.api_style != "openai_compatible":
        return False
    if cfg.requires_api_key and not cfg.api_key:
        return False
    return bool(_resolved_video_model(settings))


def _resolved_video_model(settings: Settings) -> str:
    model = (settings.ai_video_model or "").strip()
    if model:
        return model
    return default_video_model(resolve_llm_config(settings).provider_id)


def _generated_dir() -> Path:
    path = uploads_dir() / "generated-videos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _save_video_bytes(data: bytes, *, suffix: str = ".mp4") -> tuple[Path, str]:
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = _generated_dir() / filename
    dest.write_bytes(data)
    relative = f"generated-videos/{filename}"
    return dest, relative


class VideoGenerationClient:
    """Generate videos via provider `/videos` job API (OpenAI Sora)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.cfg = resolve_llm_config(self.settings)

    @property
    def enabled(self) -> bool:
        return video_generation_ready(self.settings)

    @property
    def model(self) -> str:
        return _resolved_video_model(self.settings)

    @property
    def poll_timeout_seconds(self) -> float:
        return float(self.settings.ai_video_timeout_seconds)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.cfg.api_key:
            headers["Authorization"] = f"Bearer {self.cfg.api_key}"
        return headers

    def _api_root(self) -> str:
        return self.cfg.base_url.rstrip("/")

    async def generate(
        self,
        prompt: str,
        *,
        size: VideoSize | str = "1280x720",
        seconds: VideoSeconds | str = "8",
    ) -> GeneratedVideo:
        text = (prompt or "").strip()
        if not text:
            raise VideoGenerationError("prompt is required")
        if not self.enabled:
            provider = get_provider(self.cfg.provider_id)
            if self.cfg.api_style != "openai_compatible":
                raise VideoGenerationError(
                    f"Video generation is not supported for provider {provider.label}. "
                    "Switch Agent LLM provider to OpenAI (Sora API)."
                )
            raise VideoGenerationError(
                "Video generation is disabled. Enable Agent LLM and video generation in Settings."
            )

        clip_seconds = str(seconds)
        if clip_seconds not in ("4", "8", "12"):
            clip_seconds = "8"
        clip_size = str(size)

        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": text,
            "size": clip_size,
            "seconds": clip_seconds,
        }

        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            create_url = f"{self._api_root()}/videos"
            resp = await client.post(create_url, headers=self._headers(), json=payload)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise VideoGenerationError(format_llm_http_error(exc)) from exc
            job = resp.json()

        job_id = str(job.get("id") or "").strip()
        if not job_id:
            raise VideoGenerationError("Video provider returned no job id")

        final = await self._poll_job(job_id)
        if str(final.get("status")) != "completed":
            err = final.get("error")
            message = "video job failed"
            if isinstance(err, dict) and err.get("message"):
                message = str(err["message"])
            raise VideoGenerationError(message)

        raw = await self._download_content(job_id)
        path, relative = _save_video_bytes(raw)
        return GeneratedVideo(
            path=path,
            relative_path=relative,
            url_path=f"/uploads/{relative}",
            prompt=text,
            model=self.model,
            seconds=clip_seconds,
            size=clip_size,
            job_id=job_id,
        )

    async def _poll_job(self, job_id: str) -> dict[str, Any]:
        deadline = time.monotonic() + self.poll_timeout_seconds
        url = f"{self._api_root()}/videos/{job_id}"
        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            while time.monotonic() < deadline:
                resp = await client.get(url, headers=self._headers())
                try:
                    resp.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    raise VideoGenerationError(format_llm_http_error(exc)) from exc
                data = resp.json()
                status = str(data.get("status") or "")
                if status in _TERMINAL_STATUSES:
                    return data
                await asyncio.sleep(_POLL_INTERVAL_SEC)
        raise VideoGenerationError(
            f"Video generation timed out after {int(self.poll_timeout_seconds)}s (job {job_id})"
        )

    async def _download_content(self, job_id: str) -> bytes:
        url = f"{self._api_root()}/videos/{job_id}/content"
        timeout = max(self.settings.ai_timeout_seconds, 120.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=self._headers())
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise VideoGenerationError(format_llm_http_error(exc)) from exc
            return resp.content
