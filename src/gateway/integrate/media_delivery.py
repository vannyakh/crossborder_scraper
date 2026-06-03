"""Send generated images to integrate channels."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from loguru import logger
from telegram import Update
from telegram.constants import ChatAction

from core.paths import uploads_dir
from gateway.image_delivery import images_from_tool_calls, videos_from_tool_calls


def resolve_generated_media_path(item: dict[str, Any]) -> Path | None:
    rel = str(item.get("path") or "").strip()
    if not rel:
        url = str(item.get("url") or "").strip()
        if url.startswith("/uploads/"):
            rel = url[len("/uploads/") :]
    if not rel:
        return None
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/") :]
    path = (uploads_dir() / rel).resolve()
    root = uploads_dir().resolve()
    if not str(path).startswith(str(root)) or not path.is_file():
        return None
    return path


def resolve_generated_image_path(image: dict[str, Any]) -> Path | None:
    return resolve_generated_media_path(image)


async def send_generated_images(update: Update, tool_calls: list[dict[str, Any]]) -> int:
    """Reply with photos for successful generate_image tool calls. Returns count sent."""
    message = update.effective_message
    if message is None:
        return 0

    images = images_from_tool_calls(tool_calls)
    if not images:
        return 0

    chat_id = message.chat_id
    if update.effective_chat and hasattr(update, "get_bot"):
        try:
            bot = update.get_bot()
            await bot.send_chat_action(chat_id=chat_id, action=ChatAction.UPLOAD_PHOTO)
        except Exception:
            pass

    sent = 0
    for image in images:
        path = resolve_generated_media_path(image)
        if path is None:
            continue
        caption = str(image.get("revised_prompt") or image.get("prompt") or "").strip()[:900]
        try:
            with path.open("rb") as handle:
                await message.reply_photo(photo=handle, caption=caption or None)
            sent += 1
        except Exception as exc:
            logger.warning("Telegram photo send failed for {}: {}", path, exc)
    return sent


async def send_generated_videos(update: Update, tool_calls: list[dict[str, Any]]) -> int:
    """Reply with MP4 clips for successful generate_video tool calls."""
    message = update.effective_message
    if message is None:
        return 0

    videos = videos_from_tool_calls(tool_calls)
    if not videos:
        return 0

    chat_id = message.chat_id
    try:
        bot = update.get_bot()
        await bot.send_chat_action(chat_id=chat_id, action=ChatAction.UPLOAD_VIDEO)
    except Exception:
        pass

    sent = 0
    for video in videos:
        path = resolve_generated_media_path(video)
        if path is None:
            continue
        caption = str(video.get("prompt") or "").strip()[:900]
        try:
            with path.open("rb") as handle:
                await message.reply_video(video=handle, caption=caption or None)
            sent += 1
        except Exception as exc:
            logger.warning("Telegram video send failed for {}: {}", path, exc)
    return sent
