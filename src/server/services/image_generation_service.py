"""Panel + gateway image generation service."""

from __future__ import annotations

from typing import Any

from config import Settings
from core.ai.image_client import GeneratedImage, ImageGenerationClient, ImageGenerationError
from core.paths import uploads_dir
from server.services.context import AppContext, get_context


class ImageGenerationService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    @property
    def settings(self) -> Settings:
        return self._ctx.settings

    def get_status(self) -> dict[str, Any]:
        client = ImageGenerationClient(self.settings)
        return {
            "ai_image_enabled": self.settings.ai_image_enabled,
            "ai_image_model": client.model,
            "image_ready": client.enabled,
            "uploads_dir": str(uploads_dir()),
        }

    async def generate(
        self,
        prompt: str,
        *,
        size: str = "1024x1024",
        n: int = 1,
        quality: str | None = None,
    ) -> dict[str, Any]:
        client = ImageGenerationClient(self.settings)
        try:
            images = await client.generate(prompt, size=size, n=n, quality=quality)
        except ImageGenerationError as exc:
            return {"ok": False, "error": str(exc)}
        return {"ok": True, "images": [_image_payload(img) for img in images]}

    def resolve_upload(self, relative_path: str) -> tuple[Any, str]:
        """Resolve a path under uploads/ and return (path, media_type)."""
        rel = relative_path.strip().lstrip("/")
        if rel.startswith("uploads/"):
            rel = rel[len("uploads/") :]
        if ".." in rel.split("/"):
            raise ValueError("invalid path")
        root = uploads_dir().resolve()
        path = (uploads_dir() / rel).resolve()
        if not str(path).startswith(str(root)):
            raise ValueError("invalid path")
        if not path.is_file():
            raise FileNotFoundError(rel)
        media = "image/png"
        suffix = path.suffix.lower()
        if suffix in (".jpg", ".jpeg"):
            media = "image/jpeg"
        elif suffix == ".webp":
            media = "image/webp"
        elif suffix == ".gif":
            media = "image/gif"
        elif suffix in (".mp4", ".m4v"):
            media = "video/mp4"
        elif suffix == ".webm":
            media = "video/webm"
        return path, media


def _image_payload(img: GeneratedImage) -> dict[str, Any]:
    return {
        "path": img.relative_path,
        "url": img.url_path,
        "prompt": img.prompt,
        "model": img.model,
        "revised_prompt": img.revised_prompt,
    }


_service: ImageGenerationService | None = None


def get_image_generation_service() -> ImageGenerationService:
    global _service
    if _service is None:
        _service = ImageGenerationService()
    return _service
