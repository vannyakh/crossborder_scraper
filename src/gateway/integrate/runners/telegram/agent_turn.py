"""Run gateway agent turns from Telegram (shared by messages and callbacks)."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from gateway.integrate.bot_sessions import run_agent_via_bot_session
from gateway.integrate.media_delivery import send_generated_images, send_generated_videos
from gateway.integrate.runners.telegram.chat_meta import telegram_chat_title
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.grounded_replies import (
    augment_message_for_grounding,
    try_grounded_telegram_turn,
)
from gateway.integrate.runners.telegram.reply import format_agent_reply, send_text
from gateway.integrate.runners.telegram.runs import chat_runs


async def run_agent_for_chat(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    *,
    chat_id: int,
    chat: Any,
    text: str,
    prompt_id: str | None = None,
    attachments: list[dict[str, Any]] | None = None,
) -> None:
    cfg = load_telegram_config()
    resolved_prompt = prompt_id or str(cfg.get("prompt_id") or "telegram_agent")
    max_chars = int(cfg.get("max_reply_chars") or 3500)

    if chat_runs.is_running(chat_id):
        await send_text(
            update,
            "Agent is still running for this chat. Send /stop to cancel, then retry.",
        )
        return

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
    from server.services.gateway_service import get_gateway_service

    svc = get_gateway_service()

    task = asyncio.create_task(
        _execute_turn(
            update,
            svc=svc,
            chat_id=chat_id,
            chat=chat,
            text=text,
            prompt_id=resolved_prompt,
            max_chars=max_chars,
            attachments=attachments,
        )
    )
    chat_runs.track(chat_id, task)
    try:
        await task
    except asyncio.CancelledError:
        await send_text(update, "Agent run stopped.")
    finally:
        chat_runs.clear(chat_id)


async def _execute_turn(
    update: Update,
    *,
    svc: Any,
    chat_id: int,
    chat: Any,
    text: str,
    prompt_id: str,
    max_chars: int,
    attachments: list[dict[str, Any]] | None = None,
) -> None:
    try:
        result = await try_grounded_telegram_turn(
            svc,
            channel_id="telegram",
            platform_chat_id=chat_id,
            message=text,
            platform_chat_title=telegram_chat_title(chat),
            prompt_id=prompt_id,
        )
        if result is None:
            result = await run_agent_via_bot_session(
                svc,
                channel_id="telegram",
                platform_chat_id=chat_id,
                platform_chat_title=telegram_chat_title(chat),
                message=augment_message_for_grounding(text),
                prompt_id=prompt_id,
                attachments=attachments,
            )
    except Exception as exc:
        logger.exception("Telegram agent run failed")
        await send_text(update, f"Error: {exc}"[:4000])
        return
    await send_text(update, format_agent_reply(result, max_chars))
    tool_calls = list(result.get("tool_calls") or [])
    if tool_calls:
        await send_generated_images(update, tool_calls)
        await send_generated_videos(update, tool_calls)
