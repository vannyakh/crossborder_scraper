from fastapi import HTTPException

from server.deps import protected_router
from server.schemas import (
    AgentLlmSetupResponse,
    AIConfigResponse,
    AIConfigUpdate,
    LLMHealthProbeRequest,
    LLMHealthResponse,
    LLMModelsListResponse,
    LLMModelsProbeRequest,
    LLMProviderListResponse,
    OllamaPullRequest,
    OllamaPullResponse,
)
from server.services.agent_llm_service import get_agent_llm_service

router = protected_router(prefix="/ai", tags=["ai"])


@router.get("/providers", response_model=LLMProviderListResponse)
async def list_llm_providers() -> LLMProviderListResponse:
    """Built-in LLM provider presets for the gateway agent."""
    providers = get_agent_llm_service().list_providers()
    return LLMProviderListResponse(providers=providers)


@router.post("/models", response_model=LLMModelsListResponse)
async def list_llm_models(body: LLMModelsProbeRequest | None = None) -> LLMModelsListResponse:
    """List models from the provider API using saved or draft connection settings."""
    probe = body.model_dump(exclude_unset=True) if body else None
    result = await get_agent_llm_service().list_models(probe)
    return LLMModelsListResponse(**result)


@router.get("/config", response_model=AIConfigResponse)
async def get_ai_config() -> AIConfigResponse:
    return AIConfigResponse(**get_agent_llm_service().get_status())


@router.patch("/config", response_model=AIConfigResponse)
async def patch_ai_config(body: AIConfigUpdate) -> AIConfigResponse:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    return AIConfigResponse(**get_agent_llm_service().update_config(updates))


@router.get("/agent-setup", response_model=AgentLlmSetupResponse)
async def agent_llm_setup() -> AgentLlmSetupResponse:
    """Gateway agent LLM setup checklist, health, and tool/skill summary."""
    result = await get_agent_llm_service().get_setup()
    return AgentLlmSetupResponse(**result)


@router.get("/health", response_model=LLMHealthResponse)
async def llm_health() -> LLMHealthResponse:
    """Test saved gateway agent LLM connection."""
    result = await get_agent_llm_service().check_health()
    return LLMHealthResponse(**result)


@router.post("/health", response_model=LLMHealthResponse)
async def llm_health_probe(body: LLMHealthProbeRequest | None = None) -> LLMHealthResponse:
    """Test draft provider settings before save (optional API key / base URL)."""
    probe = body.model_dump(exclude_unset=True) if body else None
    result = await get_agent_llm_service().check_health(probe)
    return LLMHealthResponse(**result)


@router.post("/ollama/pull", response_model=OllamaPullResponse)
async def ollama_pull_model(body: OllamaPullRequest) -> OllamaPullResponse:
    """Trigger an Ollama model pull in the background (fire-and-forget)."""
    result = await get_agent_llm_service().pull_ollama_model(body.model, body.base_url)
    return OllamaPullResponse(**result)
