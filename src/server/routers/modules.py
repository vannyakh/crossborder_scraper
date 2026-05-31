from fastapi import HTTPException

from server.deps import protected_router
from server.schemas import ModuleProfileDetailResponse, ModuleProfileMetaResponse
from server.services.module_profiles_service import get_module_profiles_service

router = protected_router(prefix="/modules", tags=["modules"])


@router.get("/meta", response_model=ModuleProfileMetaResponse)
async def list_module_meta() -> ModuleProfileMetaResponse:
    return ModuleProfileMetaResponse(**get_module_profiles_service().list_meta())


@router.get("/{module_id}", response_model=ModuleProfileDetailResponse)
async def get_module_profile(module_id: str) -> ModuleProfileDetailResponse:
    try:
        data = get_module_profiles_service().get_module(module_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ModuleProfileDetailResponse(**data)
