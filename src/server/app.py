from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from server.bootstrap import panel_lifespan
from server.core.constants import APP_VERSION
from server.infra.spa_static import SPAStaticFiles
from server.routers import (
    ai,
    auth,
    batches,
    files,
    gateway,
    jobs,
    logs,
    monitor,
    products,
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

_repo_root = Path(__file__).resolve().parents[2]
_ui_dist = _repo_root / "public" / "dist"

# Public + system
app.include_router(auth.router)
app.include_router(system.router)

# Control plane
app.include_router(ai.router)
app.include_router(runtime.router)
app.include_router(monitor.router)
app.include_router(logs.router)
app.include_router(service.router)
app.include_router(store.router)
app.include_router(gateway.router)

# Scrape pipeline
app.include_router(jobs.router)
app.include_router(batches.router)
app.include_router(products.router)
app.include_router(files.router)


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/ui")


if _ui_dist.is_dir() and (_ui_dist / "index.html").is_file():
    app.mount(
        "/ui",
        SPAStaticFiles(directory=str(_ui_dist), html=True),
        name="ui",
    )
