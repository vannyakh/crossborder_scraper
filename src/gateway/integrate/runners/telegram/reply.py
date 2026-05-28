"""Format and send Telegram bot replies."""

from __future__ import annotations

from typing import Any

from loguru import logger
from telegram import Update
from telegram.error import BadRequest


def format_agent_reply(result: dict[str, Any], max_chars: int) -> str:
    if not result.get("ok"):
        msg = result.get("message") or "Agent run failed."
        return msg[:max_chars]
    parts: list[str] = []
    if result.get("message"):
        parts.append(str(result["message"]))
    tools = result.get("tool_calls") or []
    if tools:
        lines = []
        for t in tools[:12]:
            name = t.get("name", "?")
            outcome = t.get("outcome") or t.get("result") or ""
            lines.append(f"- {name}: {outcome}")
        parts.append("Tools:\n" + "\n".join(lines))
    text = "\n\n".join(parts).strip() or "(no text reply)"
    return text[:max_chars]


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
