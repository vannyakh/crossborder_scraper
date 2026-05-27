"""Register all API routers on the FastAPI app (grouped by domain)."""

from __future__ import annotations

import os

from fastapi import FastAPI

from core.paths import ui_is_built
from server.infra.ui_dev_proxy import create_ui_dev_router
from server.routers import (
    ai,
    auth,
    batches,
    deploy,
    docker,
    files,
    firewall,
    gateway,
    jobs,
    logs,
    monitor,
    plugins,
    products,
    realtime,
    runtime,
    service,
    store,
    system,
)


def register_routes(app: FastAPI) -> None:
    """Mount HTTP routers and the panel UI (production build or Vite dev proxy)."""

    # Public + panel bootstrap
    app.include_router(auth.router)
    app.include_router(system.router)

    # Settings, health, observability
    app.include_router(ai.router)
    app.include_router(runtime.router)
    app.include_router(monitor.router)
    app.include_router(logs.router)
    app.include_router(service.router)
    app.include_router(deploy.router)
    app.include_router(docker.router)
    app.include_router(firewall.router)

    # Plugins & App Store (infra + scrape sources)
    app.include_router(plugins.router)
    app.include_router(store.router)

    # AI control plane
    app.include_router(gateway.router)

    # Scrape pipeline
    app.include_router(realtime.router)
    app.include_router(jobs.router)
    app.include_router(batches.router)
    app.include_router(products.router)
    app.include_router(files.router)

    _mount_ui(app)


def _mount_ui(app: FastAPI) -> None:
    force_dev = os.getenv("PANEL_UI_DEV", "").lower() in ("1", "true", "yes")
    if not force_dev and ui_is_built():
        from core.paths import ui_dist_dir
        from server.infra.spa_static import SPAStaticFiles

        app.mount(
            "/ui",
            SPAStaticFiles(directory=str(ui_dist_dir()), html=True),
            name="ui",
        )
    else:
        app.include_router(create_ui_dev_router(), prefix="/ui")
