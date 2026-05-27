"""Application startup and shutdown (aaPanel-style bootstrap)."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from config.credentials import ensure_panel_credentials, print_panel_credentials
from gateway.scheduler import get_scheduler
from gateway.schedules_store import ensure_schedules_file
from server.core.panel_bind import configure_panel_bind
from server.services.audit import log_operation
from server.app_store.state import ensure_store_state
from server.audit.service_logs import ensure_logs_file


@asynccontextmanager
async def panel_lifespan(_app: FastAPI):
    configure_panel_bind()
    ensure_logs_file()
    ensure_store_state()
    log_operation(
        user="system",
        operation_type="Service",
        details="Panel service started",
    )

    username, password, generated = ensure_panel_credentials()
    if generated:
        print_panel_credentials(username, password)

    ensure_schedules_file()
    get_scheduler().start()
    from gateway.telegram.lifecycle import start_telegram_bot, stop_telegram_bot

    await start_telegram_bot()
    yield
    await stop_telegram_bot()
    await get_scheduler().stop()
