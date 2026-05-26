from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from config.credentials import ensure_panel_credentials, print_panel_credentials
from server.routers import ai, auth, batches, files, gateway, jobs, logs, monitor, products, runtime, system
from server.spa_static import SPAStaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    from gateway.scheduler import get_scheduler
    from gateway.schedules_store import ensure_schedules_file
    from server.panel_bind import configure_panel_bind

    configure_panel_bind()

    from server.service_logs import append_service_log, ensure_logs_file

    ensure_logs_file()
    append_service_log(
        "operation",
        user="system",
        operation_type="Service",
        details="Panel service started",
    )

    username, password, generated = ensure_panel_credentials()
    if generated:
        print_panel_credentials(username, password)
    ensure_schedules_file()
    get_scheduler().start()
    yield
    await get_scheduler().stop()


app = FastAPI(
    title="Crossborder Scraper API",
    version="0.4.0",
    description="Gateway control plane: scrape, AI agent, workflows, export.",
    lifespan=lifespan,
)

_repo_root = Path(__file__).resolve().parents[2]
_ui_dist = _repo_root / "public" / "dist"

app.include_router(auth.router)
app.include_router(system.router)
app.include_router(ai.router)
app.include_router(runtime.router)
app.include_router(monitor.router)
app.include_router(logs.router)
app.include_router(gateway.router)
app.include_router(jobs.router)
app.include_router(batches.router)
app.include_router(products.router)
app.include_router(files.router)


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/ui")


# Mount UI last so API routes (/files, /batches, …) are not shadowed.
if _ui_dist.is_dir() and (_ui_dist / "index.html").is_file():
    app.mount(
        "/ui",
        SPAStaticFiles(directory=str(_ui_dist), html=True),
        name="ui",
    )
