from fastapi import HTTPException

from server.deps import protected_router
from server.schemas import (
    AgentLlmSetupResponse,
    AIConfigResponse,
    AIConfigUpdate,
    ImageGenerateRequest,
    ImageGenerateResponse,
    ImageGenerationStatusResponse,
    LLMHealthProbeRequest,
    LLMHealthResponse,
    LLMModelsListResponse,
    LLMModelsProbeRequest,
    LLMProviderListResponse,
    OllamaPullRequest,
    OllamaPullResponse,
    VideoGenerateRequest,
    VideoGenerateResponse,
    VideoGenerationStatusResponse,
)
from server.services.agent_llm_service import get_agent_llm_service
from server.services.image_generation_service import get_image_generation_service
from server.services.video_generation_service import get_video_generation_service

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


@router.get("/images/status", response_model=ImageGenerationStatusResponse)
async def image_generation_status() -> ImageGenerationStatusResponse:
    return ImageGenerationStatusResponse(**get_image_generation_service().get_status())


@router.post("/images/generate", response_model=ImageGenerateResponse)
async def generate_image(body: ImageGenerateRequest) -> ImageGenerateResponse:
    """Generate images via the configured Agent LLM provider."""
    result = await get_image_generation_service().generate(
        body.prompt,
        size=body.size,
        n=body.n,
        quality=body.quality,
    )
    return ImageGenerateResponse(**result)


@router.get("/videos/status", response_model=VideoGenerationStatusResponse)
async def video_generation_status() -> VideoGenerationStatusResponse:
    return VideoGenerationStatusResponse(**get_video_generation_service().get_status())


@router.post("/videos/generate", response_model=VideoGenerateResponse)
async def generate_video(body: VideoGenerateRequest) -> VideoGenerateResponse:
    """Generate a short video via the configured Sora-compatible provider."""
    result = await get_video_generation_service().generate(
        body.prompt,
        size=body.size,
        seconds=body.seconds,
    )
    return VideoGenerateResponse(**result)
