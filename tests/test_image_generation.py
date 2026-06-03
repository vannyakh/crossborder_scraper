"""Tests for image generation client and service."""

from __future__ import annotations

import asyncio
import base64
from unittest.mock import AsyncMock, patch

import httpx

from config import Settings
from core.ai.image_client import ImageGenerationClient, image_generation_ready
from server.services.image_generation_service import ImageGenerationService


def test_image_generation_ready_requires_openai_compatible_provider() -> None:
    settings = Settings(
        ai_enabled=True,
        ai_image_enabled=True,
        ai_provider="anthropic",
        ai_api_key="sk-test",
        ai_model="claude-3-5-haiku-20241022",
    )
    assert image_generation_ready(settings) is False


def test_image_generation_ready_with_openai_key() -> None:
    settings = Settings(
        ai_enabled=True,
        ai_image_enabled=True,
        ai_provider="openai",
        ai_api_key="sk-test",
        ai_model="gpt-4o-mini",
        ai_image_model="dall-e-3",
    )
    assert image_generation_ready(settings) is True


def test_image_client_saves_b64_response(tmp_path, monkeypatch) -> None:
    png_bytes = b"\x89PNG\r\n\x1a\n"
    payload = {
        "data": [
            {
                "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                "revised_prompt": "a red backpack product photo",
            }
        ]
    }

    settings = Settings(
        ai_enabled=True,
        ai_image_enabled=True,
        ai_provider="openai",
        ai_api_key="sk-test",
        ai_model="gpt-4o-mini",
        ai_image_model="dall-e-3",
    )

    monkeypatch.setattr(
        "core.ai.image_client.uploads_dir",
        lambda: tmp_path,
    )

    async def _run() -> None:
        client = ImageGenerationClient(settings)
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as post:
            response = httpx.Response(
                200, json=payload, request=httpx.Request("POST", "http://test")
            )
            post.return_value = response
            images = await client.generate("red backpack on white background")
        assert len(images) == 1
        assert images[0].path.is_file()
        assert images[0].url_path.startswith("/uploads/generated/")

    asyncio.run(_run())


def test_image_service_returns_error_payload() -> None:
    from core.ai.image_client import ImageGenerationError

    async def _run() -> dict:
        with patch("server.services.image_generation_service.ImageGenerationClient") as client_cls:
            client_cls.return_value.generate = AsyncMock(
                side_effect=ImageGenerationError("Image generation is disabled.")
            )
            return await ImageGenerationService().generate("anything")

    result = asyncio.run(_run())
    assert result["ok"] is False
    assert "disabled" in str(result.get("error"))
