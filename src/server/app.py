from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from config.credentials import ensure_panel_credentials, print_panel_credentials
from server.routers import ai, auth, batches, files, jobs, products, runtime, system
from server.spa_static import SPAStaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    username, password, generated = ensure_panel_credentials()
    if generated:
        print_panel_credentials(username, password)
    yield


app = FastAPI(
    title="Crossborder Scraper API",
    version="0.3.0",
    description="Full scraper control: jobs, products, files, and export processing.",
    lifespan=lifespan,
)

_repo_root = Path(__file__).resolve().parents[2]
_ui_dist = _repo_root / "public" / "dist"

app.include_router(auth.router)
app.include_router(system.router)
app.include_router(ai.router)
app.include_router(runtime.router)
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
