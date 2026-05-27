import os

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from core.paths import ui_is_built
from server.bootstrap import panel_lifespan
from server.core.constants import APP_VERSION
from server.infra.spa_static import SPAStaticFiles
from server.infra.ui_dev_proxy import create_ui_dev_router
from server.routers import (
    ai,
    auth,
    batches,
    files,
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

app = FastAPI(
    title="Crossborder Scraper API",
    version=APP_VERSION,
    description="Gateway control plane: scrape, AI agent, workflows, export.",
    lifespan=panel_lifespan,
)

_force_ui_dev = os.getenv("PANEL_UI_DEV", "").lower() in ("1", "true", "yes")

# Public + system
app.include_router(auth.router)
app.include_router(system.router)

# Control plane
app.include_router(ai.router)
app.include_router(runtime.router)
app.include_router(monitor.router)
app.include_router(logs.router)
app.include_router(service.router)
app.include_router(plugins.router)
app.include_router(store.router)
app.include_router(gateway.router)

# Scrape pipeline
app.include_router(realtime.router)
app.include_router(jobs.router)
app.include_router(batches.router)
app.include_router(products.router)
app.include_router(files.router)


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/ui")


if not _force_ui_dev and ui_is_built():
    from core.paths import ui_dist_dir

    app.mount(
        "/ui",
        SPAStaticFiles(directory=str(ui_dist_dir()), html=True),
        name="ui",
    )
else:
    app.include_router(create_ui_dev_router(), prefix="/ui")
