"""Telegram chat display helpers."""

from __future__ import annotations

from typing import Any


def telegram_chat_title(chat: Any) -> str | None:
    if chat is None:
        return None
    title = getattr(chat, "title", None)
    if title:
        return str(title).strip() or None
    first = getattr(chat, "first_name", None) or ""
    last = getattr(chat, "last_name", None) or ""
    name = f"{first} {last}".strip()
    if name:
        return name
    username = getattr(chat, "username", None)
    if username:
        return f"@{username}"
    return None
