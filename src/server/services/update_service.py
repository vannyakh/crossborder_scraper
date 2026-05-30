"""Panel software update — status check and apply via deploy maintenance."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from deploy.maintenance import MaintenanceResult, run_restart, run_update
from deploy.version import UpdateCheckResult, check_for_update
from server.core.constants import APP_VERSION


class UpdateService:
    def get_status(self) -> dict[str, Any]:
        repo = os.environ.get("CROSSBORDER_GITHUB_REPO", "").strip() or None
        info = check_for_update(current_version=APP_VERSION, github_repo=repo)
        return _serialize_check(info)

    async def apply_update(
        self,
        *,
        pull: bool = True,
        browser: bool = True,
        restart: bool = True,
        branch: str | None = None,
    ) -> dict[str, Any]:
        # Sync only — restart is deferred so nginx/Vite can receive this response
        # before the upstream panel process stops (avoids 502 on update/apply).
        result: MaintenanceResult = await asyncio.to_thread(
            run_update,
            pull=pull,
            branch=branch,
            browser=browser,
            restart_after=False,
        )
        check = check_for_update(
            current_version=APP_VERSION,
            github_repo=os.environ.get("CROSSBORDER_GITHUB_REPO") or None,
        )
        return {
            "ok": not result.warnings or bool(result.steps),
            "steps": result.steps,
            "warnings": result.warnings,
            "runtime": result.runtime.value,
            "restarting": restart,
            "current_version": APP_VERSION,
            "latest_version": check.latest_version,
            "update_available": check.update_available,
        }

    async def restart_panel(self) -> None:
        """Restart after the HTTP response has been sent (BackgroundTasks)."""
        await asyncio.sleep(0.75)
        await asyncio.to_thread(run_restart)


def _serialize_check(info: UpdateCheckResult) -> dict[str, Any]:
    return {
        "current_version": info.current_version,
        "latest_version": info.latest_version,
        "update_available": info.update_available,
        "release_url": info.release_url,
        "release_notes": info.release_notes,
        "source": info.source,
        "git_commits_behind": info.git_commits_behind,
        "git_branch": info.git_branch,
        "check_error": info.check_error,
    }


_update_service: UpdateService | None = None


def get_update_service() -> UpdateService:
    global _update_service
    if _update_service is None:
        _update_service = UpdateService()
    return _update_service
