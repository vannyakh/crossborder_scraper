"""Agent slash commands — skills, session context, free-text agent runs."""

from __future__ import annotations

from typing import Any

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from gateway.integrate.bot_sessions import resolve_bot_session, run_agent_via_bot_session
from gateway.integrate.runners.telegram.auth import is_authorized
from gateway.integrate.runners.telegram.chat_meta import telegram_chat_title
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.reply import format_agent_reply, send_text


async def _require_auth(update: Update) -> dict[str, Any] | None:
    cfg = load_telegram_config()
    if not cfg.get("enabled"):
        await send_text(update, "Telegram integrate channel is disabled in the panel.")
        return None
    if not is_authorized(update, cfg):
        await send_text(
            update,
            "Unauthorized. Send /getid, add the chat id under Integrate → Telegram, save, "
            "then try again.",
        )
        return None
    return cfg


async def cmd_skills(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if await _require_auth(update) is None:
        return
    from gateway.skills import get_skill_manager

    mgr = get_skill_manager()
    enabled = mgr.enabled_ids()
    lines = ["Enabled agent skills:", ""]
    for row in mgr.list_catalog():
        if row.get("id") not in enabled:
            continue
        tools = ", ".join(row.get("tools") or [])[:60]
        lines.append(f"• {row.get('id')} — {row.get('name') or row.get('id')}")
        if tools:
            lines.append(f"  tools: {tools}")
    if len(lines) <= 2:
        lines.append("(none enabled — check Agent → Skills in the panel)")
    await send_text(update, "\n".join(lines))


async def cmd_skill(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = await _require_auth(update)
    if cfg is None:
        return
    args = context.args or []
    if not args:
        await send_text(update, "Usage: /skill <skill_id> [message]")
        return

    skill_id = args[0].strip()
    from gateway.skills import get_skill_manager

    mgr = get_skill_manager()
    manifest = mgr.get_manifest(skill_id)
    if manifest is None:
        await send_text(update, f"Unknown skill `{skill_id}`. Send /skills to list enabled skills.")
        return

    message = " ".join(args[1:]).strip()
    if not message:
        message = (
            f"Confirm skill `{skill_id}` is active and summarize what it can do with its tools."
        )

    chat = update.effective_chat
    if chat is None:
        return
    await context.bot.send_chat_action(chat_id=chat.id, action=ChatAction.TYPING)
    from server.services.gateway_service import get_gateway_service

    svc = get_gateway_service()
    prompt_id = str(cfg.get("prompt_id") or "gateway_agent")
    max_chars = int(cfg.get("max_reply_chars") or 3500)
    try:
        result = await run_agent_via_bot_session(
            svc,
            channel_id="telegram",
            platform_chat_id=chat.id,
            platform_chat_title=telegram_chat_title(chat),
            message=message,
            prompt_id=prompt_id,
            skill_ids=[skill_id],
        )
    except Exception as exc:
        await send_text(update, f"Error: {exc}"[:4000])
        return
    await send_text(update, format_agent_reply(result, max_chars))


async def cmd_context(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = await _require_auth(update)
    if cfg is None:
        return
    chat = update.effective_chat
    if chat is None:
        return
    prompt_id = str(cfg.get("prompt_id") or "gateway_agent")
    session = resolve_bot_session(
        "telegram",
        chat.id,
        platform_chat_title=telegram_chat_title(chat),
        prompt_id=prompt_id,
    )
    messages = session.get("messages") or []
    user_turns = sum(1 for m in messages if m.get("role") in ("user", "assistant"))
    lines = [
        "Panel chat session (synced with Agent → Chat):",
        f"Session id: {session.get('id')}",
        f"Label: {session.get('display_label') or session.get('label')}",
        f"Prompt: {session.get('prompt_id')}",
        f"Messages: {user_turns}",
        "",
        "Free text in this chat continues the same session. "
        "Use /stop to cancel a running agent reply.",
    ]
    await send_text(update, "\n".join(lines))
