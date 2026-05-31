"""Project settings — visibility, variables, tokens."""

from typing import Annotated, Any

from fastapi import Depends, HTTPException

from server.auth import require_panel_auth
from server.deps import protected_router
from server.projects.deps import require_project
from server.schemas.projects import (
    ProjectSettingsPatchRequest,
    ProjectSettingsResponse,
    ProjectTokenCreateRequest,
    ProjectTokenCreateResponse,
)
from server.services.audit import log_operation, log_project_runtime
from server.services.project_service import get_project_service

router = protected_router(prefix="/projects", tags=["projects"])
ProjectRecord = Annotated[dict[str, Any], Depends(require_project)]


@router.get("/{project_id}/settings", response_model=ProjectSettingsResponse)
async def get_project_settings(project: ProjectRecord) -> ProjectSettingsResponse:
    """Project settings bundle — visibility, variables, tokens, members, and integrations."""
    payload = get_project_service().build_settings(project)
    return ProjectSettingsResponse(**payload)


@router.patch("/{project_id}/settings", response_model=ProjectSettingsResponse)
async def patch_project_settings(
    project: ProjectRecord,
    project_id: str,
    body: ProjectSettingsPatchRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectSettingsResponse:
    svc = get_project_service()
    variables = None
    if body.variables is not None:
        variables = [row.model_dump() for row in body.variables]
    svc.update_settings(project_id, visibility=body.visibility, variables=variables)
    log_operation(
        user=username,
        operation_type="Project settings",
        details=f"Update settings {project_id}",
        meta={"project_id": project_id},
    )
    log_project_runtime(
        project_id,
        user=username,
        message="Project settings saved",
        level="info",
    )
    refreshed = svc.get_project(project_id)
    return ProjectSettingsResponse(**svc.build_settings(refreshed or project))


@router.post("/{project_id}/settings/tokens", response_model=ProjectTokenCreateResponse)
async def create_project_settings_token(
    _project: ProjectRecord,
    project_id: str,
    body: ProjectTokenCreateRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectTokenCreateResponse:
    entry, secret = get_project_service().issue_token(project_id, label=body.label)
    log_operation(
        user=username,
        operation_type="Project token",
        details=f"Create token for {project_id}: {entry['label']}",
        meta={"project_id": project_id},
    )
    return ProjectTokenCreateResponse(token=entry, secret=secret)


@router.delete("/{project_id}/settings/tokens/{token_id}")
async def revoke_project_settings_token(
    _project: ProjectRecord,
    project_id: str,
    token_id: str,
    username: str = Depends(require_panel_auth),
) -> dict[str, bool]:
    ok = get_project_service().revoke_token(project_id, token_id)
    if not ok:
        raise HTTPException(status_code=404, detail="token not found")
    log_operation(
        user=username,
        operation_type="Project token",
        details=f"Revoke token {token_id} for {project_id}",
        meta={"project_id": project_id},
    )
    return {"ok": True}
