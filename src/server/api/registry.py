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
    guides,
    jobs,
    logs,
    modules,
    monitor,
    plugins,
    products,
    project_observability,
    project_run,
    project_settings,
    project_templates,
    project_ws,
    projects,
    realtime,
    runtime,
    service,
    store,
    system,
    uploads,
    vhost,
)


def register_routes(app: FastAPI) -> None:
    """Mount HTTP routers and the panel UI (production build or Vite dev proxy)."""

    # Public + panel bootstrap
    app.include_router(auth.router)
    app.include_router(system.router)

    # Settings, health, observability
    app.include_router(ai.router)
    app.include_router(uploads.router)
    app.include_router(runtime.router)
    app.include_router(monitor.router)
    app.include_router(logs.router)
    app.include_router(service.router)
    app.include_router(guides.router)
    app.include_router(modules.router)
    app.include_router(deploy.router)
    app.include_router(docker.router)
    app.include_router(firewall.router)
    app.include_router(vhost.router)

    # Plugins & App Store (infra + scrape sources)
    app.include_router(plugins.router)
    app.include_router(store.router)

    # AI control plane
    app.include_router(gateway.router)

    # Project flow canvas (template routes before /{project_id} paths)
    app.include_router(project_templates.router)
    app.include_router(projects.router)
    app.include_router(project_run.router)
    app.include_router(project_settings.router)
    app.include_router(project_observability.router)
    app.include_router(project_ws.ws_router)

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
