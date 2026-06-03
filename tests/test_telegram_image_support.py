"""Tests for Telegram inbound photo handling and vision message building."""

from __future__ import annotations

import asyncio
import base64
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

from core.ai.vision_message import build_user_message_content
from gateway.integrate.runners.telegram.media_inbound import download_telegram_photo


def test_build_user_message_content_openai_includes_image_url() -> None:
    content = build_user_message_content(
        "describe this product",
        [{"mime": "image/jpeg", "base64": "abc123"}],
        api_style="openai_compatible",
    )
    assert isinstance(content, list)
    assert content[0]["type"] == "text"
    assert content[1]["type"] == "image_url"
    assert "abc123" in content[1]["image_url"]["url"]


def test_build_user_message_content_anthropic_includes_image_block() -> None:
    content = build_user_message_content(
        "what is this?",
        [{"mime": "image/png", "base64": "xyz"}],
        api_style="anthropic",
    )
    assert isinstance(content, list)
    assert content[1]["type"] == "image"
    assert content[1]["source"]["media_type"] == "image/png"


def test_download_telegram_photo_saves_file(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "gateway.integrate.runners.telegram.media_inbound.uploads_dir",
        lambda: tmp_path,
    )

    png = b"\x89PNG\r\n\x1a\n"
    bot = AsyncMock()
    tg_file = MagicMock()
    tg_file.file_path = "photos/file_1.jpg"

    async def _download(*, custom_path: str) -> None:
        Path(custom_path).write_bytes(png)

    tg_file.download_to_drive = _download
    bot.get_file.return_value = tg_file

    photo = MagicMock()
    photo.file_id = "file-id"

    async def _run() -> dict:
        return await download_telegram_photo(bot, photo)

    attachment = asyncio.run(_run())
    assert attachment["source"] == "telegram"
    assert attachment["url"] == f"/uploads/{attachment['relative_path']}"
    assert base64.b64decode(attachment["base64"]) == png
