"""Long-polling Telegram bot → ``GatewayService.run_agent``."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from gateway.telegram.config import load_telegram_config


def _authorized(update: Update, cfg: dict[str, Any]) -> bool:
    if cfg.get("allow_any_chat"):
        return True
    chat = update.effective_chat
    if chat is None:
        return False
    allowed = cfg.get("control_chat_ids") or []
    if not allowed:
        return False
    return chat.id in allowed


def _format_agent_reply(result: dict[str, Any], max_chars: int) -> str:
    if not result.get("ok"):
        msg = result.get("message") or "Agent run failed."
        return msg[:max_chars]
    parts: list[str] = []
    if result.get("message"):
        parts.append(str(result["message"]))
    tools = result.get("tool_calls") or []
    if tools:
        lines = [f"- {t.get('name', '?')}: {t.get('result', '')}" for t in tools[:12]]
        parts.append("Tools:\n" + "\n".join(lines))
    text = "\n\n".join(parts).strip() or "(no text reply)"
    return text[:max_chars]


def _split_telegram_chunks(text: str, limit: int = 4000) -> list[str]:
    if len(text) <= limit:
        return [text]
    return [text[i : i + limit] for i in range(0, len(text), limit)]


class TelegramGatewayRunner:
    def __init__(self, cfg: dict[str, Any]) -> None:
        self._cfg = cfg
        self._app: Application | None = None

    async def run_until_stopped(self) -> None:
        token = self._cfg["bot_token"]
        self._app = Application.builder().token(token).build()
        self._app.add_handler(CommandHandler("start", self._cmd_start))
        self._app.add_handler(CommandHandler("help", self._cmd_help))
        self._app.add_handler(CommandHandler("status", self._cmd_status))
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

    async def _cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not _authorized(update, self._cfg):
            await update.effective_message.reply_text(
                "This chat is not allowed to use this bot. Add its chat_id to "
                "config/ui_config.json → telegram.control_chat_ids."
            )
            return
        cid = update.effective_chat.id if update.effective_chat else "?"
        await update.effective_message.reply_text(
            f"Crossborder gateway agent is online.\n"
            f"Your chat id: `{cid}`\n"
            f"Send any text message to run the agent (same tools as the web panel).",
            parse_mode="Markdown",
        )

    async def _cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        await self._cmd_start(update, context)

    async def _cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not _authorized(update, self._cfg):
            return
        from server.services.gateway_service import get_gateway_service

        st = get_gateway_service().get_status()
        await update.effective_message.reply_text(
            f"Gateway: {st.get('service')} v{st.get('version')}\n"
            f"Tools: {st.get('tools_count')}  Schedules: {st.get('schedules_count')}"
        )

    async def _on_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        cfg = load_telegram_config()
        if not cfg.get("enabled"):
            return
        if not _authorized(update, cfg):
            await update.effective_message.reply_text("Unauthorized.")
            return
        text = (update.effective_message.text or "").strip()
        if not text:
            return
        chat = update.effective_chat
        await context.bot.send_chat_action(chat_id=chat.id, action=ChatAction.TYPING)
        from server.services.gateway_service import get_gateway_service

        svc = get_gateway_service()
        prompt_id = str(cfg.get("prompt_id") or "gateway_agent")
        max_chars = int(cfg.get("max_reply_chars") or 3500)
        try:
            result = await svc.run_agent(text, prompt_id=prompt_id, skill_ids=None)
        except Exception as exc:
            logger.exception("Telegram agent run failed")
            await update.effective_message.reply_text(f"Error: {exc}"[:4000])
            return
        reply = _format_agent_reply(result, max_chars)
        for chunk in _split_telegram_chunks(reply):
            await update.effective_message.reply_text(chunk)

    async def _on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        logger.error("Telegram handler error: {}", context.error)
