"""Download inbound Telegram photos for gateway agent vision turns."""

from __future__ import annotations

import uuid
from typing import Any

from loguru import logger
from telegram import Bot, PhotoSize

from core.ai.vision_message import MAX_IMAGE_BYTES, attachment_from_file
from core.paths import uploads_dir


def _telegram_upload_dir() -> Any:
    path = uploads_dir() / "telegram"
    path.mkdir(parents=True, exist_ok=True)
    return path


async def download_telegram_photo(bot: Bot, photo: PhotoSize) -> dict[str, Any]:
    """Fetch the largest Telegram photo variant and return a vision attachment dict."""
    tg_file = await bot.get_file(photo.file_id)
    if tg_file.file_path is None:
        raise RuntimeError("Telegram did not return a downloadable file path")

    suffix = ".jpg"
    if "." in tg_file.file_path:
        suffix = "." + tg_file.file_path.rsplit(".", 1)[-1].lower()[:8]
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = _telegram_upload_dir() / filename

    await tg_file.download_to_drive(custom_path=str(dest))
    size = dest.stat().st_size
    if size > MAX_IMAGE_BYTES:
        dest.unlink(missing_ok=True)
        raise ValueError(f"Telegram image too large ({size} bytes)")

    mime = "image/jpeg"
    if suffix == ".png":
        mime = "image/png"
    elif suffix == ".webp":
        mime = "image/webp"

    relative = f"telegram/{filename}"
    try:
        attachment = attachment_from_file(
            dest,
            mime=mime,
            url_path=f"/uploads/{relative}",
            relative_path=relative,
            source="telegram",
        )
        return attachment
    except Exception:
        dest.unlink(missing_ok=True)
        raise


async def download_largest_photo(bot: Bot, photos: list[PhotoSize]) -> dict[str, Any]:
    if not photos:
        raise ValueError("no photos in message")
    largest = max(photos, key=lambda item: item.file_size or 0)
    try:
        return await download_telegram_photo(bot, largest)
    except Exception as exc:
        logger.warning("Telegram photo download failed: {}", exc)
        raise
