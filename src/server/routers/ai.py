from fastapi import HTTPException

from config import get_settings
from core.ai.health import check_llm_health
from server.deps import protected_router
from server.services.config import get_config_service
from server.schemas import AIConfigResponse, AIConfigUpdate, LLMHealthResponse

router = protected_router(prefix="/ai", tags=["ai"])


@router.get("/config", response_model=AIConfigResponse)
async def get_ai_config() -> AIConfigResponse:
    return AIConfigResponse(**get_config_service().get_ai_config())


@router.patch("/config", response_model=AIConfigResponse)
async def patch_ai_config(body: AIConfigUpdate) -> AIConfigResponse:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    return AIConfigResponse(**get_config_service().update_ai_config(updates))


@router.get("/health", response_model=LLMHealthResponse)
async def llm_health() -> LLMHealthResponse:
    result = await check_llm_health(get_settings())
    return LLMHealthResponse(**result)
