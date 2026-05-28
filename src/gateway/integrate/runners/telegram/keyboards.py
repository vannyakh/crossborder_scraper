"""Inline keyboards for Telegram bot actions."""

from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def agent_confirm_keyboard(token: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Run agent", callback_data=f"a:ok:{token}"),
                InlineKeyboardButton("Cancel", callback_data=f"a:no:{token}"),
            ],
        ]
    )
