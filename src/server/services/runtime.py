"""Runtime snapshot with consistent uptime and version."""

from __future__ import annotations

from typing import Any

from server.core.constants import APP_VERSION, SERVICE_STARTED_AT


def get_service_runtime(manager: Any) -> dict[str, Any]:
    data = manager.get_runtime_status(started_at=SERVICE_STARTED_AT)
    data["version"] = APP_VERSION
    return data
