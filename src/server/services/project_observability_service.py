"""Project observability — scoped logs and runtime metrics payload."""

from __future__ import annotations

from typing import Any, Literal

from server.audit.service_logs import import_agent_runs_to_cron_logs, list_service_logs
from server.projects.runtime_log_store import (
    list_project_runtime_logs,
    runtime_log_to_service_entry,
)
from server.projects.runtime_metrics_store import build_project_runtime_payload

ProjectLogCategory = Literal["operation", "run", "cron", "runtime"]


class ProjectObservabilityService:
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
        if category == "cron":
            import_agent_runs_to_cron_logs()

        if category == "runtime":
            items, total = list_project_runtime_logs(
                project_id,
                q=q,
                since=since,
                limit=limit,
                offset=offset,
            )
            mapped = [runtime_log_to_service_entry(item) for item in items]
            return {
                "category": category,
                "items": mapped,
                "total": total,
                "limit": limit,
                "offset": offset,
            }

        items, total = list_service_logs(
            category,
            q=q,
            project_id=project_id,
            since=since,
            limit=limit,
            offset=offset,
        )
        return {
            "category": category,
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    def get_runtime(self, project: dict[str, Any]) -> dict[str, Any]:
        return build_project_runtime_payload(project)


_service: ProjectObservabilityService | None = None


def get_project_observability_service() -> ProjectObservabilityService:
    global _service
    if _service is None:
        _service = ProjectObservabilityService()
    return _service
