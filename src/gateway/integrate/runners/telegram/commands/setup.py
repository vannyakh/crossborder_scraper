"""Setup slash commands — available before the chat is authorized."""

from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from gateway.integrate.runners.telegram.auth import chat_id, is_authorized, user_id
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.group_agent import group_agent_hint, is_group_chat
from gateway.integrate.runners.telegram.messages import (
    format_commands_menu,
    format_getid_reply,
    format_setup_reply,
)
from gateway.integrate.runners.telegram.reply import send_text


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cid = chat_id(update)
    if cid is None:
        await send_text(update, "Could not read chat id from this update.")
        return
    cfg = load_telegram_config()
    authorized = is_authorized(update, cfg)
    user = update.effective_user
    user_name = user.first_name if user and user.first_name else None
    first_visit = True
    if authorized:
        try:
            from gateway.integrate.runners.telegram.commands.menu import sync_command_menu

            await sync_command_menu(context.bot)
        except Exception:
            pass
        from gateway.integrate.runners.telegram.session_setup import (
            ensure_telegram_session_onboarding,
        )

        chat = update.effective_chat
        if chat is not None:
            _, first_visit = ensure_telegram_session_onboarding(
                chat.id,
                chat,
                user,
                cfg,
            )
    group_hint = None
    if is_group_chat(update):
        group_hint = group_agent_hint(cfg, getattr(context.bot, "username", None))
    await send_text(
        update,
        format_setup_reply(
            cid,
            authorized=authorized,
            user_name=user_name,
            cfg=cfg,
            first_visit=first_visit,
            group_hint=group_hint,
        ),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await cmd_start(update, context)


async def cmd_commands(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    from gateway.integrate.runners.telegram.commands.registry import all_commands

    cfg = load_telegram_config()
    authorized = is_authorized(update, cfg)
    await send_text(update, format_commands_menu(all_commands(), authorized=authorized))


async def cmd_getid(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cid = chat_id(update)
    if cid is None:
        await send_text(update, "Could not read chat id from this update.")
        return
    cfg = load_telegram_config()
    authorized = is_authorized(update, cfg)
    await send_text(update, format_getid_reply(cid, authorized=authorized))


async def cmd_whoami(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cid = chat_id(update)
    uid = user_id(update)
    user = update.effective_user
    cfg = load_telegram_config()
    authorized = is_authorized(update, cfg)
    username = f"@{user.username}" if user and user.username else "—"
    name = user.full_name if user else "—"
    lines = [
        f"Chat id: {cid}",
        f"User id: {uid}",
        f"Name: {name}",
        f"Username: {username}",
        f"Authorized: {'yes' if authorized else 'no'}",
    ]
    await send_text(update, "\n".join(lines))
