"""Community project flow templates — list, detail, and instantiate as projects."""

from __future__ import annotations

from typing import Any

from server.projects.community.clone import clone_flow_graph
from server.projects.community.loader import discover_project_templates, get_project_template
from server.schemas.project_templates import ProjectTemplateUseRequest


class ProjectTemplatesService:
    def list_templates(self, *, category: str | None = None) -> dict[str, Any]:
        templates = discover_project_templates()
        rows = [template.to_summary_dict() for template in templates.values()]
        if category:
            rows = [row for row in rows if row.get("category") == category]

        rows.sort(
            key=lambda item: (
                not item.get("featured"),
                item.get("category_label") or "",
                (item.get("name") or "").lower(),
            )
        )

        categories: dict[str, dict[str, Any]] = {}
        for row in rows:
            bucket = categories.setdefault(
                str(row.get("category") or "general"),
                {
                    "id": row.get("category") or "general",
                    "label": row.get("category_label") or "General",
                    "count": 0,
                },
            )
            bucket["count"] = int(bucket["count"]) + 1
            if row.get("category_label"):
                bucket["label"] = row["category_label"]

        category_rows = sorted(categories.values(), key=lambda item: item["label"])
        return {
            "items": rows,
            "categories": category_rows,
            "total": len(rows),
        }

    def get_template(self, template_id: str) -> dict[str, Any]:
        template = get_project_template(template_id)
        if not template:
            raise LookupError(f"unknown project template: {template_id}")
        return template.to_detail_dict()

    def use_template(self, template_id: str, body: ProjectTemplateUseRequest) -> dict[str, Any]:
        from server.services.project_service import get_project_service

        template = get_project_template(template_id)
        if not template:
            raise LookupError(f"unknown project template: {template_id}")

        project_name = (body.name or template.name).strip()
        nodes, edges = clone_flow_graph(list(template.nodes), list(template.edges))
        project = get_project_service().create_project_from_flow(
            name=project_name,
            environment=body.environment,
            description=(body.description or template.summary).strip(),
            nodes=nodes,
            edges=edges,
            template_id=template.id,
        )
        return {
            "template_id": template.id,
            "template_name": template.name,
            "project": project,
        }


_service: ProjectTemplatesService | None = None


def get_project_templates_service() -> ProjectTemplatesService:
    global _service
    if _service is None:
        _service = ProjectTemplatesService()
    return _service
