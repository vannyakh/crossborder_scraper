"""Telegram bot channel — routes messages to the gateway agent (OpenClaw-style control chat)."""

from config.telegram_store import default_telegram, load_telegram_config, normalize_telegram
from gateway.telegram.lifecycle import start_telegram_bot, stop_telegram_bot

__all__ = [
    "default_telegram",
    "load_telegram_config",
    "normalize_telegram",
    "start_telegram_bot",
    "stop_telegram_bot",
]
