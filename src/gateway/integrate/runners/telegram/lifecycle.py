"""Telegram long-polling lifecycle for the integrate channel registry."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from gateway.integrate.runners.telegram.runner import TelegramGatewayRunner

_task: asyncio.Task[None] | None = None
_runner: TelegramGatewayRunner | None = None


def is_active() -> bool:
    return _task is not None and not _task.done()


async def start() -> None:
    global _task, _runner
    from gateway.integrate.runners.telegram.config import load_telegram_config
    from gateway.integrate.runners.telegram.runner import TelegramGatewayRunner

    cfg = load_telegram_config()
    if not cfg.get("enabled") or not cfg.get("bot_token"):
        return
    if is_active():
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
