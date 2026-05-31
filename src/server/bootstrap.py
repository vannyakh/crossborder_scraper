"""Application startup and shutdown (panel service bootstrap)."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from config.credentials import ensure_panel_credentials, print_panel_credentials
from gateway.scheduler import get_scheduler
from gateway.schedules_store import ensure_schedules_file
from server.app_store.state import ensure_store_state
from server.audit.service_logs import ensure_logs_file
from server.core.panel_bind import configure_panel_bind
from server.projects.flow_store import ensure_projects_dir
from server.services.audit import log_operation


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
    ensure_projects_dir()
    get_scheduler().start()
    from gateway.integrate.lifecycle import start_all_channels, stop_all_channels

    await start_all_channels()
    from server.projects.collaboration import start_project_collaboration_hub

    await start_project_collaboration_hub()
    yield

    from server.projects.collaboration import stop_project_collaboration_hub

    await stop_project_collaboration_hub()
    await stop_all_channels()
    await get_scheduler().stop()
