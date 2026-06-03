"""Telegram long-polling lifecycle for the integrate channel registry."""

from __future__ import annotations

import asyncio
import os
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from gateway.integrate.runners.telegram.runner import TelegramGatewayRunner

_task: asyncio.Task[None] | None = None
_runner: TelegramGatewayRunner | None = None


def is_active() -> bool:
    return _task is not None and not _task.done()


def _telegram_polling_skip_reason() -> str | None:
    """Skip polling when another panel instance already owns the bot token."""
    flag = os.environ.get("CROSSBORDER_SKIP_TELEGRAM_POLL", "").strip().lower()
    if flag in ("1", "true", "yes"):
        return "CROSSBORDER_SKIP_TELEGRAM_POLL is set"

    from config import get_settings
    from deploy.network import DEFAULT_PANEL_PORT, is_port_free

    settings = get_settings()
    port = int(settings.panel_port)
    primary_busy = not is_port_free("127.0.0.1", DEFAULT_PANEL_PORT)
    if primary_busy and port != DEFAULT_PANEL_PORT:
        return (
            f"primary panel still running on port {DEFAULT_PANEL_PORT} "
            f"(this instance is on {port} — Telegram polling skipped to avoid bot conflict)"
        )
    return None


async def start() -> None:
    global _task, _runner
    from gateway.integrate.runners.telegram.config import load_telegram_config
    from gateway.integrate.runners.telegram.runner import TelegramGatewayRunner

    cfg = load_telegram_config()
    if not cfg.get("enabled") or not cfg.get("bot_token"):
        return
    if is_active():
        return

    skip = _telegram_polling_skip_reason()
    if skip:
        logger.warning("Telegram gateway bot: not started — {}", skip)
        return

    _runner = TelegramGatewayRunner(cfg)
    _task = asyncio.create_task(_runner.run_until_stopped(), name="telegram-gateway-bot")
    logger.info("Telegram gateway bot: polling started")


async def reload() -> None:
    await stop()
    await start()


async def stop() -> None:
    global _task, _runner
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
    _runner = None
    logger.info("Telegram gateway bot: stopped")
