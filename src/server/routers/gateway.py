from typing import Any

from fastapi import HTTPException

from gateway.agent_runtime import GatewayAgent
from gateway.prompts import list_prompts
from gateway.scheduler import get_scheduler
from gateway.schedules_store import (
    compute_next_run,
    delete_schedule,
    ensure_schedules_file,
    get_schedule,
    load_runs,
    load_schedules,
    upsert_schedule,
)
from gateway.tools import TOOL_DEFINITIONS
from gateway.workflows import WORKFLOW_TEMPLATES, run_workflow
from server.core.constants import APP_VERSION
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import (
    AgentRunListResponse,
    AgentSchedule,
    AgentScheduleCreate,
    AgentScheduleListResponse,
    AgentScheduleUpdate,
    GatewayAgentRequest,
    GatewayAgentResponse,
    GatewayPromptListResponse,
    GatewayStatusResponse,
    GatewayToolListResponse,
    GatewayWorkflowListResponse,
    GatewayWorkflowRunRequest,
    GatewayWorkflowRunResponse,
)
from server.services.runtime import get_service_runtime

router = protected_router(prefix="/gateway", tags=["gateway"])


@router.get("/status", response_model=GatewayStatusResponse)
async def gateway_status() -> GatewayStatusResponse:
    runtime = get_service_runtime(get_manager())
    return GatewayStatusResponse(
        service="crossborder-scraper-gateway",
        version=APP_VERSION,
        control_plane="fastapi",
        clients=["web-ui", "cli", "agent", "cron"],
        tools_count=len(TOOL_DEFINITIONS),
        workflows_count=len(WORKFLOW_TEMPLATES),
        runtime=runtime,
    )


@router.get("/tools", response_model=GatewayToolListResponse)
async def list_tools() -> GatewayToolListResponse:
    return GatewayToolListResponse(items=TOOL_DEFINITIONS)


@router.get("/prompts", response_model=GatewayPromptListResponse)
async def list_agent_prompts() -> GatewayPromptListResponse:
    return GatewayPromptListResponse(items=list_prompts())  # type: ignore[arg-type]


@router.get("/workflows", response_model=GatewayWorkflowListResponse)
async def list_workflows() -> GatewayWorkflowListResponse:
    items = [
        {
            "id": wf_id,
            "label": meta["label"],
            "description": meta["description"],
            "inputs": meta.get("inputs") or [],
            "steps": [s["tool"] for s in meta.get("steps") or []],
        }
        for wf_id, meta in WORKFLOW_TEMPLATES.items()
    ]
    return GatewayWorkflowListResponse(items=items)


@router.post("/agent/run", response_model=GatewayAgentResponse)
async def agent_run(body: GatewayAgentRequest) -> GatewayAgentResponse:
    mgr = get_manager()
    agent = GatewayAgent(mgr.settings)
    result = await agent.run(
        body.message.strip(),
        manager=mgr,
        prompt_id=body.prompt_id,
    )
    return GatewayAgentResponse(**result)


@router.get("/schedules", response_model=AgentScheduleListResponse)
async def list_schedules() -> AgentScheduleListResponse:
    ensure_schedules_file()
    items = [AgentSchedule(**s) for s in load_schedules()]
    return AgentScheduleListResponse(items=items)


@router.post("/schedules", response_model=AgentSchedule)
async def create_schedule(body: AgentScheduleCreate) -> AgentSchedule:
    try:
        compute_next_run(body.cron)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"invalid cron: {exc}") from exc
    record = upsert_schedule(body.model_dump())
    return AgentSchedule(**record)


@router.patch("/schedules/{schedule_id}", response_model=AgentSchedule)
async def update_schedule(schedule_id: str, body: AgentScheduleUpdate) -> AgentSchedule:
    existing = get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail="schedule not found")
    patch = body.model_dump(exclude_unset=True)
    if "cron" in patch:
        try:
            patch["next_run_at"] = compute_next_run(patch["cron"])
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"invalid cron: {exc}") from exc
    record = upsert_schedule({**existing, **patch, "id": schedule_id})
    return AgentSchedule(**record)


@router.delete("/schedules/{schedule_id}")
async def remove_schedule(schedule_id: str) -> dict[str, bool]:
    if not delete_schedule(schedule_id):
        raise HTTPException(status_code=404, detail="schedule not found")
    return {"ok": True}


@router.post("/schedules/{schedule_id}/run", response_model=GatewayAgentResponse)
async def run_schedule_now(schedule_id: str) -> GatewayAgentResponse:
    result = await get_scheduler().run_schedule(schedule_id, trigger="manual")
    if result.get("error") and not result.get("message"):
        raise HTTPException(status_code=400, detail=result["error"])
    return GatewayAgentResponse(
        ok=bool(result.get("ok")),
        message=result.get("message") or result.get("error") or "",
        tool_calls=result.get("tool_calls") or [],
        model=result.get("model"),
        prompt_id=result.get("prompt_id"),
    )


@router.get("/runs", response_model=AgentRunListResponse)
async def list_agent_runs(limit: int = 30) -> AgentRunListResponse:
    items = [AgentRunRecord(**r) for r in load_runs(limit=limit)]
    return AgentRunListResponse(items=items)


@router.post("/workflows/{workflow_id}/run", response_model=GatewayWorkflowRunResponse)
async def workflow_run(workflow_id: str, body: GatewayWorkflowRunRequest) -> GatewayWorkflowRunResponse:
    if workflow_id not in WORKFLOW_TEMPLATES:
        raise HTTPException(status_code=404, detail=f"unknown workflow: {workflow_id}")
    try:
        result = await run_workflow(workflow_id, inputs=body.inputs, manager=get_manager())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GatewayWorkflowRunResponse(**result)
