"""Start/stop Telegram long-polling alongside the FastAPI panel."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from gateway.telegram.runner import TelegramGatewayRunner

_task: asyncio.Task[None] | None = None
_runner: TelegramGatewayRunner | None = None


async def start_telegram_bot() -> None:
    global _task, _runner
    from gateway.telegram.config import load_telegram_config
    from gateway.telegram.runner import TelegramGatewayRunner

    cfg = load_telegram_config()
    if not cfg.get("enabled") or not cfg.get("bot_token"):
        return
    if _task and not _task.done():
        return
    _runner = TelegramGatewayRunner(cfg)
    _task = asyncio.create_task(_runner.run_until_stopped(), name="telegram-gateway-bot")
    logger.info("Telegram gateway bot: polling started")


async def reload_telegram_bot() -> None:
    await stop_telegram_bot()
    await start_telegram_bot()


async def stop_telegram_bot() -> None:
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
