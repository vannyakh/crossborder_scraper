"""FastAPI dependencies for project routes."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from server.services.project_service import get_project_service


def require_project(project_id: str) -> dict[str, Any]:
    """Load a project or raise 404 — use as ``Depends(require_project)``."""
    record = get_project_service().get_project(project_id)
    if not record:
        raise HTTPException(status_code=404, detail="project not found")
    return record
