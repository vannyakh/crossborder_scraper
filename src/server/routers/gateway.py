from fastapi import BackgroundTasks, Depends, File, HTTPException, Query, UploadFile

from gateway.skills import SkillInstallError, get_skill_installer
from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas import (
    AgentChatSession,
    AgentChatSessionChannelSummary,
    AgentChatSessionCreateRequest,
    AgentChatSessionListResponse,
    AgentChatSessionUpdateRequest,
    AgentRuleCreateRequest,
    AgentRuleDeleteResponse,
    AgentRuleDetail,
    AgentRuleEnableRequest,
    AgentRuleInfo,
    AgentRuleListResponse,
    AgentRuleUpdateRequest,
    AgentRunListResponse,
    AgentRunRecord,
    AgentSchedule,
    AgentScheduleCreate,
    AgentScheduleListResponse,
    AgentScheduleUpdate,
    GatewayAgentRequest,
    GatewayAgentResponse,
    GatewayPromptListResponse,
    GatewaySkillEnableRequest,
    GatewaySkillInfo,
    GatewaySkillListResponse,
    GatewayStatusResponse,
    GatewayToolListResponse,
    GatewayWorkflowListResponse,
    GatewayWorkflowRunRequest,
    GatewayWorkflowRunResponse,
    IntegrateChannelDetailResponse,
    IntegrateChannelListResponse,
    IntegrateChannelReloadResponse,
    IntegrateChannelUpdateRequest,
    PanelUpdateApplyRequest,
    PanelUpdateApplyResponse,
    PanelUpdateStatusResponse,
    SkillInstallResponse,
    SkillRegistryDetailResponse,
    SkillRegistryInstallRequest,
    SkillRegistryListResponse,
    SkillUninstallResponse,
    TelegramChannelConfig,
    TelegramChannelUpdate,
)
from server.services.gateway_service import get_gateway_service
from server.services.update_service import get_update_service

router = protected_router(prefix="/gateway", tags=["gateway"])


@router.get("/status", response_model=GatewayStatusResponse)
async def gateway_status() -> GatewayStatusResponse:
    return GatewayStatusResponse(**get_gateway_service().get_status())


@router.get("/update/status", response_model=PanelUpdateStatusResponse)
async def gateway_update_status() -> PanelUpdateStatusResponse:
    """Check GitHub / git for a newer panel version."""
    return PanelUpdateStatusResponse(**get_update_service().get_status())


@router.post("/update/apply", response_model=PanelUpdateApplyResponse)
async def gateway_update_apply(
    background_tasks: BackgroundTasks,
    body: PanelUpdateApplyRequest | None = None,
) -> PanelUpdateApplyResponse:
    """
    Pull latest code, sync dependencies, and restart the panel.

    Restart is scheduled after the response so nginx/Vite do not 502 this request.
    """
    payload = body or PanelUpdateApplyRequest()
    result = await get_update_service().apply_update(
        pull=payload.pull,
        browser=payload.browser,
        restart=payload.restart,
        branch=payload.branch,
    )
    if payload.restart:
        background_tasks.add_task(get_update_service().restart_panel)
    return PanelUpdateApplyResponse(**result)


@router.get("/telegram", response_model=TelegramChannelConfig)
async def get_telegram_channel() -> TelegramChannelConfig:
    return TelegramChannelConfig(**get_gateway_service().get_telegram_config())


@router.patch("/telegram", response_model=TelegramChannelConfig)
async def update_telegram_channel(body: TelegramChannelUpdate) -> TelegramChannelConfig:
    svc = get_gateway_service()
    payload = body.model_dump(exclude_unset=True)
    data = svc.update_telegram_config(payload)
    await svc.reload_integrate_channel("telegram")
    return TelegramChannelConfig(**data)


@router.get("/channels", response_model=IntegrateChannelListResponse)
async def list_integrate_channels() -> IntegrateChannelListResponse:
    data = get_gateway_service().list_integrate_channels()
    return IntegrateChannelListResponse(**data)


@router.get("/channels/{channel_id}", response_model=IntegrateChannelDetailResponse)
async def get_integrate_channel(channel_id: str) -> IntegrateChannelDetailResponse:
    svc = get_gateway_service()
    try:
        data = svc.get_integrate_channel(channel_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return IntegrateChannelDetailResponse(**data)


@router.patch("/channels/{channel_id}", response_model=IntegrateChannelDetailResponse)
async def update_integrate_channel(
    channel_id: str,
    body: IntegrateChannelUpdateRequest,
) -> IntegrateChannelDetailResponse:
    svc = get_gateway_service()
    try:
        data = svc.update_integrate_channel(channel_id, body.updates)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await svc.reload_integrate_channel(channel_id)
    return IntegrateChannelDetailResponse(**data)


@router.post("/channels/{channel_id}/reload", response_model=IntegrateChannelReloadResponse)
async def reload_integrate_channel(channel_id: str) -> IntegrateChannelReloadResponse:
    svc = get_gateway_service()
    result = await svc.reload_integrate_channel(channel_id)
    return IntegrateChannelReloadResponse(**result)


@router.get("/tools", response_model=GatewayToolListResponse)
async def list_tools() -> GatewayToolListResponse:
    return GatewayToolListResponse(items=get_gateway_service().list_tools())


@router.get("/prompts", response_model=GatewayPromptListResponse)
async def list_agent_prompts() -> GatewayPromptListResponse:
    return GatewayPromptListResponse(items=get_gateway_service().list_prompts())  # type: ignore[arg-type]


@router.get("/workflows", response_model=GatewayWorkflowListResponse)
async def list_workflows() -> GatewayWorkflowListResponse:
    return GatewayWorkflowListResponse(items=get_gateway_service().list_workflows())


@router.get("/skills", response_model=GatewaySkillListResponse)
async def list_agent_skills() -> GatewaySkillListResponse:
    data = get_gateway_service().list_skills()
    return GatewaySkillListResponse(
        items=[GatewaySkillInfo(**i) for i in data["items"]],
        total=data["total"],
        enabled=data["enabled"],
    )


@router.put("/skills/enabled", response_model=GatewaySkillListResponse)
async def set_enabled_skills(body: GatewaySkillEnableRequest) -> GatewaySkillListResponse:
    svc = get_gateway_service()
    svc.set_enabled_skills(body.enabled)
    data = svc.list_skills()
    return GatewaySkillListResponse(
        items=[GatewaySkillInfo(**i) for i in data["items"]],
        total=data["total"],
        enabled=data["enabled"],
    )


@router.get("/rules", response_model=AgentRuleListResponse)
async def list_agent_rules() -> AgentRuleListResponse:
    data = get_gateway_service().list_rules()
    return AgentRuleListResponse(
        items=[AgentRuleInfo(**i) for i in data["items"]],
        total=data["total"],
        enabled=data["enabled"],
    )


@router.put("/rules/enabled", response_model=AgentRuleListResponse)
async def set_enabled_rules(body: AgentRuleEnableRequest) -> AgentRuleListResponse:
    svc = get_gateway_service()
    svc.set_enabled_rules(body.enabled)
    data = svc.list_rules()
    return AgentRuleListResponse(
        items=[AgentRuleInfo(**i) for i in data["items"]],
        total=data["total"],
        enabled=data["enabled"],
    )


@router.get("/rules/{rule_id}", response_model=AgentRuleDetail)
async def get_agent_rule(rule_id: str) -> AgentRuleDetail:
    svc = get_gateway_service()
    try:
        data = svc.get_rule(rule_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AgentRuleDetail(**data)


@router.post("/rules", response_model=AgentRuleDetail)
async def create_agent_rule(
    body: AgentRuleCreateRequest,
    _username: str = Depends(require_panel_auth),
) -> AgentRuleDetail:
    svc = get_gateway_service()
    try:
        data = svc.create_rule(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AgentRuleDetail(**data)


@router.patch("/rules/{rule_id}", response_model=AgentRuleDetail)
async def update_agent_rule(rule_id: str, body: AgentRuleUpdateRequest) -> AgentRuleDetail:
    svc = get_gateway_service()
    patch = body.model_dump(exclude_unset=True)
    try:
        data = svc.update_rule(rule_id, patch)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AgentRuleDetail(**data)


@router.delete("/rules/{rule_id}", response_model=AgentRuleDeleteResponse)
async def delete_agent_rule(rule_id: str) -> AgentRuleDeleteResponse:
    svc = get_gateway_service()
    try:
        result = svc.delete_rule(rule_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AgentRuleDeleteResponse(**result)


@router.post("/skills/install", response_model=SkillInstallResponse)
async def install_agent_skill(
    file: UploadFile = File(...),
    replace: bool = Query(False),
    _username: str = Depends(require_panel_auth),
) -> SkillInstallResponse:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="only .zip archives are accepted")
    data = await file.read()
    try:
        result = get_skill_installer().install_zip(data, replace=replace)
    except SkillInstallError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SkillInstallResponse(**result)


@router.delete("/skills/installed/{skill_id}", response_model=SkillUninstallResponse)
async def uninstall_agent_skill(skill_id: str) -> SkillUninstallResponse:
    try:
        result = get_skill_installer().uninstall(skill_id)
    except SkillInstallError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SkillUninstallResponse(**result)


@router.get("/skills/registry", response_model=SkillRegistryListResponse)
async def browse_skill_registry(
    kind: str = Query("skill", pattern="^(skill|plugin)$"),
    sort: str = Query("downloads", pattern="^(downloads|updated|newest|stars|installs)$"),
    limit: int = Query(24, ge=1, le=100),
    cursor: str | None = Query(None),
    q: str | None = Query(None, max_length=200),
) -> SkillRegistryListResponse:
    svc = get_gateway_service()
    try:
        data = await svc.browse_skill_registry(
            kind=kind,
            sort=sort,
            limit=limit,
            cursor=cursor,
            q=q,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SkillRegistryListResponse(**data)


@router.get("/skills/registry/{slug}", response_model=SkillRegistryDetailResponse)
async def get_registry_skill_detail(slug: str) -> SkillRegistryDetailResponse:
    svc = get_gateway_service()
    try:
        data = await svc.get_registry_skill_detail(slug)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SkillRegistryDetailResponse(**data)


@router.post("/skills/registry/install", response_model=SkillInstallResponse)
async def install_registry_skill(
    body: SkillRegistryInstallRequest,
    _username: str = Depends(require_panel_auth),
) -> SkillInstallResponse:
    svc = get_gateway_service()
    try:
        result = await svc.install_skill_from_registry(
            slug=body.slug,
            version=body.version,
            replace=body.replace,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SkillInstallResponse(**result)


@router.post("/skills/registry/{slug}/update", response_model=SkillInstallResponse)
async def update_registry_skill(
    slug: str,
    version: str | None = Query(None, max_length=40),
    _username: str = Depends(require_panel_auth),
) -> SkillInstallResponse:
    svc = get_gateway_service()
    try:
        result = await svc.update_skill_from_registry(slug, version=version)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SkillInstallResponse(**result)


@router.post("/agent/run", response_model=GatewayAgentResponse)
async def agent_run(body: GatewayAgentRequest) -> GatewayAgentResponse:
    svc = get_gateway_service()
    try:
        result = await svc.run_agent(
            body.message,
            prompt_id=body.prompt_id,
            skill_ids=body.skill_ids,
            session_id=body.session_id,
            think=body.think,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return GatewayAgentResponse(**result)


@router.get("/chat/sessions", response_model=AgentChatSessionListResponse)
async def list_chat_sessions(
    channel_id: str | None = Query(None, max_length=32),
) -> AgentChatSessionListResponse:
    payload = get_gateway_service().list_chat_sessions(channel_id=channel_id)
    return AgentChatSessionListResponse(
        items=[AgentChatSession(**s) for s in payload["items"]],
        total=payload["total"],
        channels=[AgentChatSessionChannelSummary(**c) for c in payload.get("channels") or []],
    )


@router.post("/chat/sessions", response_model=AgentChatSession)
async def create_chat_session(body: AgentChatSessionCreateRequest) -> AgentChatSession:
    record = get_gateway_service().create_chat_session(body.model_dump(exclude_unset=True))
    return AgentChatSession(**record)


@router.get("/chat/sessions/{session_id}", response_model=AgentChatSession)
async def get_chat_session(session_id: str) -> AgentChatSession:
    svc = get_gateway_service()
    try:
        record = svc.get_chat_session(session_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AgentChatSession(**record)


@router.patch("/chat/sessions/{session_id}", response_model=AgentChatSession)
async def update_chat_session(
    session_id: str,
    body: AgentChatSessionUpdateRequest,
) -> AgentChatSession:
    svc = get_gateway_service()
    try:
        record = svc.update_chat_session(session_id, body.model_dump(exclude_unset=True))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AgentChatSession(**record)


@router.delete("/chat/sessions/{session_id}")
async def remove_chat_session(session_id: str) -> dict[str, bool]:
    if not get_gateway_service().delete_chat_session(session_id):
        raise HTTPException(status_code=404, detail="session not found")
    return {"ok": True}


@router.get("/schedules", response_model=AgentScheduleListResponse)
async def list_schedules() -> AgentScheduleListResponse:
    items = [AgentSchedule(**s) for s in get_gateway_service().list_schedules()]
    return AgentScheduleListResponse(items=items)


@router.post("/schedules", response_model=AgentSchedule)
async def create_schedule(body: AgentScheduleCreate) -> AgentSchedule:
    svc = get_gateway_service()
    try:
        record = svc.create_schedule(body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"invalid cron: {exc}") from exc
    return AgentSchedule(**record)


@router.patch("/schedules/{schedule_id}", response_model=AgentSchedule)
async def update_schedule(schedule_id: str, body: AgentScheduleUpdate) -> AgentSchedule:
    svc = get_gateway_service()
    patch = body.model_dump(exclude_unset=True)
    try:
        record = svc.update_schedule(schedule_id, patch)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"invalid cron: {exc}") from exc
    return AgentSchedule(**record)


@router.delete("/schedules/{schedule_id}")
async def remove_schedule(schedule_id: str) -> dict[str, bool]:
    if not get_gateway_service().delete_schedule(schedule_id):
        raise HTTPException(status_code=404, detail="schedule not found")
    return {"ok": True}


@router.post("/schedules/{schedule_id}/run", response_model=GatewayAgentResponse)
async def run_schedule_now(schedule_id: str) -> GatewayAgentResponse:
    result = await get_gateway_service().run_schedule_now(schedule_id)
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
    items = [AgentRunRecord(**r) for r in get_gateway_service().list_runs(limit=limit)]
    return AgentRunListResponse(items=items)


@router.post("/workflows/{workflow_id}/run", response_model=GatewayWorkflowRunResponse)
async def workflow_run(
    workflow_id: str, body: GatewayWorkflowRunRequest
) -> GatewayWorkflowRunResponse:
    svc = get_gateway_service()
    try:
        result = await svc.run_workflow(workflow_id, inputs=body.inputs)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return GatewayWorkflowRunResponse(**result)
