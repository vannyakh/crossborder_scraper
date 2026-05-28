"""Inline-button callbacks (confirm / cancel agent runs)."""

from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from gateway.integrate.runners.telegram.agent_turn import run_agent_for_chat
from gateway.integrate.runners.telegram.auth import is_authorized
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.pending import pending_agent


async def on_agent_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or not query.data:
        return

    parts = query.data.split(":", 2)
    if len(parts) != 3 or parts[0] != "a" or parts[1] not in {"ok", "no"}:
        return

    action, token = parts[1], parts[2]
    req = pending_agent.get(token)
    if req is None:
        await query.answer("This request expired. Send your message again.", show_alert=True)
        return

    user = query.from_user
    if user is None or user.id != req.user_id:
        await query.answer("Only the sender can confirm this request.", show_alert=True)
        return

    cfg = load_telegram_config()
    if not is_authorized(update, cfg):
        await query.answer("Chat not authorized.", show_alert=True)
        return

    pending_agent.pop(token)

    if action == "no":
        await query.answer("Cancelled")
        if query.message:
            await query.message.edit_text("Agent request cancelled.")
        return

    await query.answer("Running agent…")
    if query.message:
        preview = req.text[:240] + ("…" if len(req.text) > 240 else "")
        await query.message.edit_text(f"Confirmed — running agent:\n{preview}")

    chat = query.message.chat if query.message else None
    if chat is None:
        return

    await run_agent_for_chat(
        update,
        context,
        chat_id=req.chat_id,
        chat=chat,
        text=req.text,
        prompt_id=req.prompt_id,
    )
