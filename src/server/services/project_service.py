"""Project aggregate facade — flow, settings, and observability entry point."""

from __future__ import annotations

from typing import Any

from server.schemas.projects import (
    ProjectCreateRequest,
    ProjectFlowUpdateRequest,
    ProjectUpdateRequest,
)
from server.services.project_flow_service import ProjectFlowService, get_project_flow_service
from server.services.project_observability_service import (
    ProjectLogCategory,
    ProjectObservabilityService,
    get_project_observability_service,
)
from server.services.project_settings_service import (
    build_project_settings,
    delete_project_token,
    issue_project_token,
    sync_inferred_variables,
    update_project_settings,
)


class ProjectService:
    """Single orchestration boundary for panel project routes and gateway tools."""

    def __init__(
        self,
        *,
        flow: ProjectFlowService | None = None,
        observability: ProjectObservabilityService | None = None,
    ) -> None:
        self._flow = flow or get_project_flow_service()
        self._observability = observability or get_project_observability_service()

    # --- Flow aggregate ---

    def list_projects(self) -> list[dict[str, Any]]:
        return self._flow.list_projects()

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        return self._flow.get_project(project_id)

    def create_project(self, body: ProjectCreateRequest) -> dict[str, Any]:
        return self._flow.create_project(body)

    def create_project_from_flow(
        self,
        *,
        name: str,
        environment: str,
        description: str,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        template_id: str | None = None,
    ) -> dict[str, Any]:
        return self._flow.create_project_from_flow(
            name=name,
            environment=environment,
            description=description,
            nodes=nodes,
            edges=edges,
            template_id=template_id,
        )

    def update_project(self, project_id: str, body: ProjectUpdateRequest) -> dict[str, Any]:
        return self._flow.update_project(project_id, body)

    def update_flow(self, project_id: str, body: ProjectFlowUpdateRequest) -> dict[str, Any]:
        return self._flow.update_flow(project_id, body)

    def delete_project(self, project_id: str) -> bool:
        return self._flow.delete_project(project_id)

    # --- Settings aggregate ---

    def build_settings(self, project: dict[str, Any]) -> dict[str, Any]:
        return build_project_settings(project)

    def update_settings(
        self,
        project_id: str,
        *,
        visibility: str | None = None,
        variables: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return update_project_settings(project_id, visibility=visibility, variables=variables)

    def issue_token(self, project_id: str, *, label: str) -> tuple[dict[str, Any], str]:
        return issue_project_token(project_id, label=label)

    def revoke_token(self, project_id: str, token_id: str) -> bool:
        return delete_project_token(project_id, token_id)

    def sync_inferred_variables(self, project: dict[str, Any]) -> bool:
        return sync_inferred_variables(project)

    # --- Observability ---

    def list_logs(
        self,
        project_id: str,
        *,
        category: ProjectLogCategory = "operation",
        q: str = "",
        since: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> dict[str, Any]:
        return self._observability.list_logs(
            project_id,
            category=category,
            q=q,
            since=since,
            limit=limit,
            offset=offset,
        )

    def get_runtime(self, project: dict[str, Any]) -> dict[str, Any]:
        return self._observability.get_runtime(project)


_service: ProjectService | None = None


def get_project_service() -> ProjectService:
    global _service
    if _service is None:
        _service = ProjectService()
    return _service
