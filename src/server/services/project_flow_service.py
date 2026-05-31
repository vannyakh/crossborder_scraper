"""Project flow CRUD — canvas graphs persisted under data/projects/."""

from __future__ import annotations

from typing import Any

from server.projects.derive import bump_flow_revision
from server.projects.flow_store import (
    delete_project,
    ensure_projects_dir,
    load_all_projects,
    load_project,
    new_project_id,
    save_project,
    starter_flow_nodes,
)
from server.schemas.projects import (
    ProjectCreateRequest,
    ProjectDetail,
    ProjectFlowUpdateRequest,
    ProjectSummary,
    ProjectUpdateRequest,
)


class ProjectFlowService:
    def list_projects(self) -> list[dict[str, Any]]:
        ensure_projects_dir()
        items = load_all_projects()
        items.sort(key=lambda p: p.get("updated_at") or "", reverse=True)
        return [self._to_summary(p) for p in items]

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        ensure_projects_dir()
        record = load_project(project_id)
        if not record:
            return None
        return self._to_detail(record)

    def create_project(self, body: ProjectCreateRequest) -> dict[str, Any]:
        nodes, edges = starter_flow_nodes()
        return self._create_project_record(
            name=body.name.strip(),
            environment=body.environment,
            description=(body.description or "").strip(),
            nodes=nodes,
            edges=edges,
            template_id=None,
        )

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
        return self._create_project_record(
            name=name,
            environment=environment,
            description=description,
            nodes=nodes,
            edges=edges,
            template_id=template_id,
        )

    def _create_project_record(
        self,
        *,
        name: str,
        environment: str,
        description: str,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        template_id: str | None,
    ) -> dict[str, Any]:
        from server.projects.settings_store import ensure_project_settings

        record: dict[str, Any] = {
            "id": new_project_id(name),
            "name": name,
            "environment": environment,
            "description": description,
            "nodes": nodes,
            "edges": edges,
        }
        if template_id:
            record["template_id"] = template_id
            record["template_source"] = "community"
        saved = save_project(record)
        ensure_project_settings(saved["id"])
        return self._to_detail(saved)

    def update_project(self, project_id: str, body: ProjectUpdateRequest) -> dict[str, Any]:
        record = load_project(project_id)
        if not record:
            raise ValueError(f"unknown project: {project_id}")
        if body.name is not None:
            record["name"] = body.name.strip()
        if body.environment is not None:
            record["environment"] = body.environment
        if body.description is not None:
            record["description"] = body.description.strip()
        saved = save_project(record)
        return self._to_detail(saved)

    def update_flow(self, project_id: str, body: ProjectFlowUpdateRequest) -> dict[str, Any]:
        from server.services.project_settings_service import sync_inferred_variables

        record = load_project(project_id)
        if not record:
            raise ValueError(f"unknown project: {project_id}")
        record["nodes"] = body.nodes
        record["edges"] = body.edges
        record = bump_flow_revision(record)
        saved = save_project(record)
        sync_inferred_variables(saved)
        return self._to_detail(saved)

    def delete_project(self, project_id: str) -> bool:
        from server.projects.runtime_log_store import delete_project_runtime_logs
        from server.projects.runtime_metrics_store import delete_project_runtime_metrics
        from server.projects.settings_store import delete_project_settings

        ok = delete_project(project_id)
        if not ok:
            return False
        delete_project_settings(project_id)
        delete_project_runtime_logs(project_id)
        delete_project_runtime_metrics(project_id)
        return True

    def _to_summary(self, record: dict[str, Any]) -> dict[str, Any]:
        return ProjectSummary(
            id=str(record["id"]),
            name=str(record.get("name") or record["id"]),
            environment=record.get("environment") or "development",
            services_online=int(record.get("services_online") or 0),
            services_total=int(record.get("services_total") or 0),
            updated_at=str(record.get("updated_at") or ""),
            description=record.get("description"),
            preview_nodes=record.get("preview_nodes") or [],
            preview_edges=record.get("preview_edges") or [],
        ).model_dump()

    def _to_detail(self, record: dict[str, Any]) -> dict[str, Any]:
        summary = self._to_summary(record)
        return ProjectDetail(
            **summary,
            nodes=record.get("nodes") or [],
            edges=record.get("edges") or [],
            flow_revision=int(record.get("flow_revision") or 0),
        ).model_dump()


_manager: ProjectFlowService | None = None


def get_project_flow_service() -> ProjectFlowService:
    global _manager
    if _manager is None:
        _manager = ProjectFlowService()
    return _manager
