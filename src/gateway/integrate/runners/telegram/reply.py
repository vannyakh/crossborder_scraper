"""Format and send Telegram bot replies."""

from __future__ import annotations

from loguru import logger
from telegram import Update
from telegram.error import BadRequest

from gateway.integrate.runners.telegram.telegram_response import format_agent_reply

__all__ = ["format_agent_reply", "send_text", "split_telegram_chunks"]


def split_telegram_chunks(text: str, limit: int = 4000) -> list[str]:
    if len(text) <= limit:
        return [text]
    return [text[i : i + limit] for i in range(0, len(text), limit)]


async def send_text(
    update: Update,
    text: str,
    *,
    parse_mode: str | None = None,
) -> None:
    message = update.effective_message
    if message is None:
        return
    for chunk in split_telegram_chunks(text):
        try:
            await message.reply_text(chunk, parse_mode=parse_mode)
        except BadRequest as exc:
            if parse_mode and "parse" in str(exc).lower():
                logger.debug("Telegram parse_mode failed, retrying plain text: {}", exc)
                await message.reply_text(chunk)
                continue
            raise
