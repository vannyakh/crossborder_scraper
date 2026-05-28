"""Long-polling Telegram bot → gateway agent and slash commands."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from telegram import Update
from telegram.ext import Application, CallbackQueryHandler, ContextTypes, MessageHandler, filters

from gateway.integrate.runners.telegram.agent_turn import run_agent_for_chat
from gateway.integrate.runners.telegram.auth import is_authorized
from gateway.integrate.runners.telegram.chat_meta import telegram_chat_title
from gateway.integrate.runners.telegram.commands.callbacks import on_agent_callback
from gateway.integrate.runners.telegram.commands.menu import sync_command_menu
from gateway.integrate.runners.telegram.commands.registry import register_command_handlers
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.group_agent import (
    extract_agent_message,
    is_group_chat,
    is_message_to_agent,
)
from gateway.integrate.runners.telegram.keyboards import agent_confirm_keyboard
from gateway.integrate.runners.telegram.messages import (
    format_agent_confirm_preview,
    format_getid_reply,
    format_setup_reply,
)
from gateway.integrate.runners.telegram.pending import confirm_before_agent, pending_agent
from gateway.integrate.runners.telegram.reply import send_text
from gateway.integrate.runners.telegram.runs import chat_runs

# Re-export for tests and callers
__all__ = [
    "TelegramGatewayRunner",
    "format_getid_reply",
    "format_setup_reply",
]


class TelegramGatewayRunner:
    def __init__(self, cfg: dict[str, Any]) -> None:
        self._cfg = cfg
        self._app: Application | None = None

    async def _post_init(self, app: Application) -> None:
        try:
            count = await sync_command_menu(app.bot)
            logger.info("Telegram bot command menu synced ({} commands)", count)
        except Exception as exc:
            logger.warning("Telegram command menu sync failed: {}", exc)

    async def run_until_stopped(self) -> None:
        token = self._cfg["bot_token"]
        self._app = Application.builder().token(token).post_init(self._post_init).build()
        register_command_handlers(self._app)
        self._app.add_handler(CallbackQueryHandler(on_agent_callback, pattern=r"^a:(ok|no):"))
        self._app.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, self._on_text),
        )
        self._app.add_error_handler(self._on_error)

        await self._app.initialize()
        await self._app.start()
        await self._app.updater.start_polling(drop_pending_updates=True)
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        finally:
            if self._app.updater.running:
                await self._app.updater.stop()
            await self._app.stop()
            await self._app.shutdown()
            self._app = None

    async def _on_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        cfg = load_telegram_config()
        if not cfg.get("enabled"):
            return
        if is_group_chat(update) and not is_message_to_agent(update, context, cfg):
            return
        if not is_authorized(update, cfg):
            await send_text(
                update,
                "Unauthorized. Send /getid, add the chat id under Integrate → Telegram, save, "
                "then try again.",
            )
            return
        text = (update.effective_message.text or "").strip()
        if not text:
            return
        text = extract_agent_message(text, update, context, cfg)
        if not text:
            return
        chat = update.effective_chat
        user = update.effective_user
        if chat is None or user is None:
            return
        if chat_runs.is_running(chat.id):
            await send_text(
                update,
                "Agent is still running for this chat. Send /stop to cancel, then retry.",
            )
            return

        prompt_id = str(cfg.get("prompt_id") or "telegram_agent")
        if confirm_before_agent(cfg, is_group=is_group_chat(update)):
            pending = pending_agent.put(
                chat_id=chat.id,
                user_id=user.id,
                text=text,
                prompt_id=prompt_id,
                platform_chat_title=telegram_chat_title(chat),
            )
            message = update.effective_message
            if message is None:
                return
            await message.reply_text(
                format_agent_confirm_preview(text),
                reply_markup=agent_confirm_keyboard(pending.token),
            )
            return

        await run_agent_for_chat(
            update,
            context,
            chat_id=chat.id,
            chat=chat,
            text=text,
            prompt_id=prompt_id,
        )

    async def _on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        logger.error("Telegram handler error: {}", context.error)
