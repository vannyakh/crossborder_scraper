"""Telegram config adapter (persisted in ui_config.json → telegram)."""

from config.telegram_store import (
    default_telegram,
    load_telegram_config,
    merge_telegram_updates,
    normalize_telegram,
)

__all__ = [
    "default_telegram",
    "load_telegram_config",
    "merge_telegram_updates",
    "normalize_telegram",
]
