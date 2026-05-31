"""Project observability — scoped logs and runtime metrics."""

from typing import Annotated, Any, Literal

from fastapi import Depends, Query

from server.deps import protected_router
from server.projects.deps import require_project
from server.schemas import ServiceLogListResponse
from server.schemas.projects import ProjectRuntimeResponse
from server.services.project_service import get_project_service

router = protected_router(prefix="/projects", tags=["projects"])
ProjectRecord = Annotated[dict[str, Any], Depends(require_project)]
ProjectLogCategory = Literal["operation", "run", "cron", "runtime"]


@router.get("/{project_id}/logs", response_model=ServiceLogListResponse)
async def get_project_logs(
    _project: ProjectRecord,
    project_id: str,
    category: ProjectLogCategory = Query("operation"),
    q: str = Query(""),
    since: str | None = Query(None, description="ISO timestamp — only logs at or after this time"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> ServiceLogListResponse:
    """Service and flow runtime logs scoped to this project."""
    payload = get_project_service().list_logs(
        project_id,
        category=category,
        q=q,
        since=since,
        limit=limit,
        offset=offset,
    )
    return ServiceLogListResponse(**payload)


@router.get("/{project_id}/runtime", response_model=ProjectRuntimeResponse)
async def get_project_runtime(project: ProjectRecord) -> ProjectRuntimeResponse:
    """Host metrics estimate scoped to flow services, plus recent runtime logs."""
    payload = get_project_service().get_runtime(project)
    return ProjectRuntimeResponse(**payload)
