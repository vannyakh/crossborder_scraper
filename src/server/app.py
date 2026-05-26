from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from server.routers import batches, files, jobs, products, system

app = FastAPI(
    title="Crossborder Scraper API",
    version="0.2.0",
    description="Full scraper control: jobs, products, files, and export processing.",
)

_repo_root = Path(__file__).resolve().parents[2]
_ui_dist = _repo_root / "public" / "dist"
if _ui_dist.exists():
    app.mount("/ui", StaticFiles(directory=str(_ui_dist), html=True), name="ui")

app.include_router(system.router)
app.include_router(jobs.router)
app.include_router(batches.router)
app.include_router(products.router)
app.include_router(files.router)


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/ui")
