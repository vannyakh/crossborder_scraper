"""Telegram control-chat authorization helpers."""

from __future__ import annotations

from typing import Any

from telegram import Update


def chat_id(update: Update) -> int | None:
    chat = update.effective_chat
    return chat.id if chat is not None else None


def user_id(update: Update) -> int | None:
    user = update.effective_user
    return user.id if user is not None else None


def is_authorized(update: Update, cfg: dict[str, Any]) -> bool:
    if cfg.get("allow_any_chat"):
        return True
    chat = update.effective_chat
    if chat is None:
        return False
    allowed = cfg.get("control_chat_ids") or []
    if not allowed:
        return False
    return chat.id in allowed
