"""Detect when a group message is directed at the gateway agent."""

from __future__ import annotations

import re
from typing import Any

from telegram import Update
from telegram.constants import MessageEntityType
from telegram.ext import ContextTypes

_GROUP_TYPES = frozenset({"group", "supergroup"})


def is_group_chat(update: Update) -> bool:
    chat = update.effective_chat
    return chat is not None and str(getattr(chat, "type", "") or "") in _GROUP_TYPES


def group_require_mention(cfg: dict[str, Any]) -> bool:
    return bool(cfg.get("group_require_mention", True))


def is_message_to_agent(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    cfg: dict[str, Any],
) -> bool:
    """True when the agent should reply (DM always; groups need mention/reply/name)."""
    if not is_group_chat(update):
        return True
    if not group_require_mention(cfg):
        return True

    message = update.effective_message
    if message is None:
        return False

    bot = context.bot
    bot_id = getattr(bot, "id", None)
    bot_username = str(getattr(bot, "username", "") or "").strip().lower()

    if _is_reply_to_bot(message, bot_id):
        return True
    if _has_bot_entity_mention(message, bot_id, bot_username):
        return True

    text = (message.text or message.caption or "").strip()
    if not text:
        return False
    return _text_calls_agent(text, cfg, bot_username)


def extract_agent_message(
    text: str,
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    cfg: dict[str, Any],
) -> str:
    """Remove @mention and wake-name prefixes before sending to the LLM."""
    cleaned = text.strip()
    if not cleaned or not is_group_chat(update):
        return cleaned

    bot_username = str(getattr(context.bot, "username", "") or "").strip()
    if bot_username:
        cleaned = re.sub(rf"@{re.escape(bot_username)}\b", "", cleaned, flags=re.IGNORECASE)

    display = str(cfg.get("bot_display_name") or "").strip()
    if display:
        cleaned = re.sub(rf"\b{re.escape(display)}\b", "", cleaned, flags=re.IGNORECASE)

    for alias in _wake_names(cfg):
        cleaned = re.sub(rf"\b{re.escape(alias)}\b", "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,:-")
    return cleaned or text.strip()


def group_agent_hint(cfg: dict[str, Any], bot_username: str | None) -> str:
    """Short hint shown in group /start when mention is required."""
    name = str(cfg.get("bot_display_name") or "the agent").strip()
    if bot_username:
        return f"In groups, tag @{bot_username} or reply to this bot to reach {name}."
    return f'In groups, reply to this bot or say "{name}" to start a request.'


def _is_reply_to_bot(message: Any, bot_id: int | None) -> bool:
    if bot_id is None:
        return False
    reply = message.reply_to_message
    if reply is None or reply.from_user is None:
        return False
    return reply.from_user.id == bot_id


def _has_bot_entity_mention(message: Any, bot_id: int | None, bot_username: str) -> bool:
    entities = message.entities or message.caption_entities or []
    text = message.text or message.caption or ""
    for entity in entities:
        if entity.type == MessageEntityType.MENTION and bot_username:
            segment = text[entity.offset : entity.offset + entity.length].lower()
            if segment == f"@{bot_username}":
                return True
        if entity.type == MessageEntityType.TEXT_MENTION and bot_id is not None:
            user = getattr(entity, "user", None)
            if user is not None and getattr(user, "id", None) == bot_id:
                return True
    return False


def _text_calls_agent(text: str, cfg: dict[str, Any], bot_username: str) -> bool:
    lowered = text.lower()
    if bot_username and f"@{bot_username}" in lowered:
        return True
    display = str(cfg.get("bot_display_name") or "").strip().lower()
    if display and display in lowered:
        return True
    for alias in _wake_names(cfg):
        if _alias_at_start(lowered, alias):
            return True
    return False


def _wake_names(cfg: dict[str, Any]) -> list[str]:
    raw = cfg.get("agent_wake_names")
    if not isinstance(raw, list):
        return ["agent"]
    names = [str(x).strip().lower() for x in raw if str(x).strip()]
    return names or ["agent"]


def _alias_at_start(text: str, alias: str) -> bool:
    if not alias:
        return False
    t = text.strip().lower()
    a = alias.lower()
    if t.startswith(f"{a} ") or t.startswith(f"{a},"):
        return True
    return f" {a} " in f" {t} "
