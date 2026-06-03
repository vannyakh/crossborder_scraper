"""OpenAI-compatible image generation for the gateway agent."""

from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

import httpx

from config import Settings
from config.llm_providers import get_provider
from core.ai.llm_client import format_llm_http_error, resolve_llm_config
from core.paths import uploads_dir

ImageSize = Literal["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]

DEFAULT_IMAGE_MODELS: dict[str, str] = {
    "openai": "dall-e-3",
    "google": "",
    "anthropic": "",
    "ollama": "",
    "qwen": "",
    "custom": "dall-e-3",
}


@dataclass(frozen=True)
class GeneratedImage:
    path: Path
    relative_path: str
    url_path: str
    prompt: str
    model: str
    revised_prompt: str | None = None


class ImageGenerationError(Exception):
    """Image provider returned an error or the panel is not configured."""


def default_image_model(provider_id: str) -> str:
    return DEFAULT_IMAGE_MODELS.get(provider_id, "dall-e-3")


def image_generation_ready(settings: Settings) -> bool:
    if not settings.ai_enabled or not settings.ai_image_enabled:
        return False
    cfg = resolve_llm_config(settings)
    if cfg.api_style != "openai_compatible":
        return False
    if cfg.requires_api_key and not cfg.api_key:
        return False
    return bool(_resolved_image_model(settings))


def _resolved_image_model(settings: Settings) -> str:
    model = (settings.ai_image_model or "").strip()
    if model:
        return model
    return default_image_model(resolve_llm_config(settings).provider_id)


def _generated_dir() -> Path:
    path = uploads_dir() / "generated"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _save_image_bytes(data: bytes, *, suffix: str = ".png") -> tuple[Path, str]:
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = _generated_dir() / filename
    dest.write_bytes(data)
    relative = f"generated/{filename}"
    return dest, relative


async def _download_image(url: str, *, timeout: float) -> bytes:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ImageGenerationError(format_llm_http_error(exc)) from exc
        return resp.content


class ImageGenerationClient:
    """Generate images via provider `/images/generations` endpoints."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.cfg = resolve_llm_config(self.settings)

    @property
    def enabled(self) -> bool:
        return image_generation_ready(self.settings)

    @property
    def model(self) -> str:
        return _resolved_image_model(self.settings)

    async def generate(
        self,
        prompt: str,
        *,
        size: ImageSize | str = "1024x1024",
        n: int = 1,
        quality: str | None = None,
    ) -> list[GeneratedImage]:
        text = (prompt or "").strip()
        if not text:
            raise ImageGenerationError("prompt is required")
        if not self.enabled:
            provider = get_provider(self.cfg.provider_id)
            if self.cfg.api_style != "openai_compatible":
                raise ImageGenerationError(
                    f"Image generation is not supported for provider {provider.label}. "
                    "Switch Agent LLM provider to OpenAI (or another OpenAI-compatible host)."
                )
            raise ImageGenerationError(
                "Image generation is disabled. Enable Agent LLM and image generation in Settings."
            )

        count = max(1, min(int(n), 4))
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": text,
            "n": count,
            "size": str(size),
            "response_format": "b64_json",
        }
        if quality and self.model.startswith(("dall-e-3", "gpt-image")):
            payload["quality"] = quality

        url = f"{self.cfg.base_url.rstrip('/')}/images/generations"
        headers = {"Content-Type": "application/json"}
        if self.cfg.api_key:
            headers["Authorization"] = f"Bearer {self.cfg.api_key}"

        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            resp = await client.post(url, headers=headers, json=payload)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise ImageGenerationError(format_llm_http_error(exc)) from exc
            data = resp.json()

        items = data.get("data") or []
        if not isinstance(items, list) or not items:
            raise ImageGenerationError("Image provider returned no images")

        out: list[GeneratedImage] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            revised = item.get("revised_prompt")
            if item.get("b64_json"):
                raw = base64.b64decode(str(item["b64_json"]))
                path, relative = _save_image_bytes(raw)
            elif item.get("url"):
                raw = await _download_image(
                    str(item["url"]), timeout=self.settings.ai_timeout_seconds
                )
                suffix = Path(urlparse(str(item["url"])).path).suffix or ".png"
                path, relative = _save_image_bytes(raw, suffix=suffix)
            else:
                continue
            out.append(
                GeneratedImage(
                    path=path,
                    relative_path=relative,
                    url_path=f"/uploads/{relative}",
                    prompt=text,
                    model=self.model,
                    revised_prompt=str(revised) if revised else None,
                )
            )
        if not out:
            raise ImageGenerationError("Image provider returned no usable image data")
        return out
