import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import get_settings
from core.engine import BatchReport, JobResult, ScrapeEngine, ScrapeJob


class SubmitRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1)
    workers: int | None = None
    use_ai: bool | None = None
    save: bool = True


class SubmitResponse(BaseModel):
    batch_id: str
    total: int
    status: str = "accepted"


class StatusResponse(BaseModel):
    started_at: datetime
    running: bool
    completed: int
    total: int
    success: int
    failed: int


app = FastAPI(title="Crossborder Scraper API", version="0.1.0")

# UI build output (Vite) is served from /ui
_repo_root = Path(__file__).resolve().parents[3]
_ui_dist = _repo_root / "public" / "dist"
if _ui_dist.exists():
    app.mount("/ui", StaticFiles(directory=str(_ui_dist), html=True), name="ui")


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/ui")


# In-memory batch registry (simple, single-container). For multi-node use Redis/DB.
_batches: dict[str, BatchReport] = {}
_batch_status: dict[str, dict[str, Any]] = {}
_lock = asyncio.Lock()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/config")
async def config() -> dict[str, Any]:
    s = get_settings()
    return {
        "max_concurrent_jobs": s.max_concurrent_jobs,
        "proxy_list_path": str(s.proxy_list_path),
        "proxy_rotation_strategy": s.proxy_rotation_strategy,
        "ai_enabled": s.ai_enabled,
        "ai_fallback": s.ai_fallback,
        "ai_model": s.ai_model,
        "cookies_dir": str(s.cookies_dir),
        "output_dir": str(s.output_dir),
        "db_path": str(s.db_path),
    }


@app.post("/jobs/submit", response_model=SubmitResponse)
async def submit(req: SubmitRequest) -> SubmitResponse:
    settings = get_settings()
    engine = ScrapeEngine(settings, max_workers=req.workers)
    jobs = [ScrapeJob(url=u, use_ai=req.use_ai) for u in req.urls]

    report = BatchReport(total=len(jobs))
    async with _lock:
        _batches[report.batch_id] = report
        _batch_status[report.batch_id] = {
            "started_at": datetime.utcnow(),
            "running": True,
            "completed": 0,
            "total": len(jobs),
            "success": 0,
            "failed": 0,
        }

    async def _run_batch() -> None:
        def _progress(done: int, _total: int, result: JobResult) -> None:
            st = _batch_status.get(report.batch_id)
            if not st:
                return
            st["completed"] = done
            if result.status.value == "success":
                st["success"] = st.get("success", 0) + 1
            else:
                st["failed"] = st.get("failed", 0) + 1

        final = await engine.run_batch(jobs, save=req.save, progress=_progress)
        async with _lock:
            _batches[report.batch_id] = final
            st = _batch_status.get(report.batch_id, {})
            st["running"] = False
            st["completed"] = final.total
            st["success"] = final.success
            st["failed"] = final.failed
            _batch_status[report.batch_id] = st

    asyncio.create_task(_run_batch())
    return SubmitResponse(batch_id=report.batch_id, total=len(jobs))


@app.get("/jobs/{batch_id}/status", response_model=StatusResponse)
async def batch_status(batch_id: str) -> StatusResponse:
    st = _batch_status.get(batch_id)
    if not st:
        raise HTTPException(status_code=404, detail="batch not found")
    return StatusResponse(**st)


@app.get("/jobs/{batch_id}/result", response_model=BatchReport)
async def batch_result(batch_id: str) -> BatchReport:
    report = _batches.get(batch_id)
    if not report:
        raise HTTPException(status_code=404, detail="batch not found")
    return report

