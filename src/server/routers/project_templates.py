"""Project templates and plugin profile catalog — read-only project bootstrap routes."""

from fastapi import Depends, HTTPException, Query

from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas.plugin_profiles import PluginProfileCatalogResponse
from server.schemas.project_templates import (
    ProjectTemplateDetailResponse,
    ProjectTemplateListResponse,
    ProjectTemplateUseRequest,
    ProjectTemplateUseResponse,
)
from server.services.audit import log_operation, log_project_runtime
from server.services.project_templates_service import get_project_templates_service

router = protected_router(prefix="/projects", tags=["projects"])


@router.get("/plugin-profiles/catalog", response_model=PluginProfileCatalogResponse)
async def list_plugin_profiles() -> PluginProfileCatalogResponse:
    """Manifest-driven node config profiles (LLM model, scraper sources, agent slots)."""
    from server.projects.plugin_profiles import build_plugin_profile_catalog

    payload = build_plugin_profile_catalog()
    return PluginProfileCatalogResponse(**payload)


@router.get("/templates", response_model=ProjectTemplateListResponse)
async def list_project_templates(
    category: str | None = Query(default=None, description="Filter by template category"),
) -> ProjectTemplateListResponse:
    """Community flow templates — reusable project workflows for the panel canvas."""
    payload = get_project_templates_service().list_templates(category=category)
    return ProjectTemplateListResponse(**payload)


@router.get("/templates/{template_id}", response_model=ProjectTemplateDetailResponse)
async def get_project_template(template_id: str) -> ProjectTemplateDetailResponse:
    try:
        data = get_project_templates_service().get_template(template_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProjectTemplateDetailResponse(**data)


@router.post("/templates/{template_id}/use", response_model=ProjectTemplateUseResponse)
async def use_project_template(
    template_id: str,
    body: ProjectTemplateUseRequest,
    username: str = Depends(require_panel_auth),
) -> ProjectTemplateUseResponse:
    """Create a new project from a community flow template."""
    svc = get_project_templates_service()
    try:
        payload = svc.use_template(template_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    project = payload["project"]
    log_operation(
        user=username,
        operation_type="Project template",
        details=f"Use template {template_id} → {project['id']} ({project['name']})",
        meta={"project_id": project["id"], "template_id": template_id},
    )
    log_project_runtime(
        project["id"],
        user=username,
        message=f"Project created from template · {payload['template_name']}",
        level="success",
    )
    return ProjectTemplateUseResponse(**payload)
