"""Panel network access — status and host firewall actions."""

from __future__ import annotations

from typing import Any

from config import get_settings
from deploy.network_access import (
    build_network_access_status,
    run_full_access_setup,
    run_host_firewall_setup,
)
from server.services.audit import log_operation


class NetworkAccessService:
    def get_status(self, *, port: int | None = None) -> dict[str, Any]:
        settings = get_settings()
        chosen = port or settings.panel_port
        return build_network_access_status(port=chosen)

    def apply_host_firewall(
        self,
        *,
        port: int | None = None,
        enable_ufw: bool = False,
        username: str = "panel",
    ) -> dict[str, Any]:
        settings = get_settings()
        chosen = port or settings.panel_port
        messages = run_host_firewall_setup(chosen, enable_ufw=enable_ufw, allow_ssh=True)
        status = build_network_access_status(port=chosen)
        ok = any("allowed" in m.lower() or "enabled" in m.lower() for m in messages) or (
            not status["ufw"].get("active") and not status["firewalld"].get("active")
        )
        log_operation(
            user=username,
            operation_type="Network access",
            details=f"Host firewall apply port={chosen} enable_ufw={enable_ufw}: "
            + "; ".join(messages[:3]),
        )
        return {"ok": ok, "messages": messages, "status": status}

    def run_full_setup(
        self,
        *,
        port: int | None = None,
        ensure_bind: bool = True,
        enable_ufw: bool = True,
        open_firewall: bool = True,
        persist_external: bool = True,
        username: str = "panel",
    ) -> dict[str, Any]:
        settings = get_settings()
        chosen = port or settings.panel_port
        result = run_full_access_setup(
            chosen,
            ensure_bind=ensure_bind,
            enable_ufw=enable_ufw,
            open_firewall=open_firewall,
            persist_external=persist_external,
        )
        messages = list(result.pop("messages", []))
        ok = bool(result.get("ok"))
        log_operation(
            user=username,
            operation_type="Network access",
            details=f"Full access setup port={chosen}: " + "; ".join(messages[:4]),
        )
        return {
            "ok": ok,
            "messages": messages,
            "status": result,
            "restart_required": ensure_bind,
        }


_service: NetworkAccessService | None = None


def get_network_access_service() -> NetworkAccessService:
    global _service
    if _service is None:
        _service = NetworkAccessService()
    return _service
