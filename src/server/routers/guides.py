from fastapi import HTTPException, Query

from server.deps import protected_router
from server.schemas import PanelGuideDetailResponse, PanelGuideListResponse
from server.services.guides_service import get_guides_service

router = protected_router(prefix="/guides", tags=["guides"])


@router.get("", response_model=PanelGuideListResponse)
async def list_panel_guides(
    category: str | None = Query(default=None, description="Filter by category id"),
) -> PanelGuideListResponse:
    return PanelGuideListResponse(**get_guides_service().list_guides(category=category))


@router.get("/{guide_id}", response_model=PanelGuideDetailResponse)
async def get_panel_guide(guide_id: str) -> PanelGuideDetailResponse:
    try:
        data = get_guides_service().get_guide(guide_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return PanelGuideDetailResponse(**data)
