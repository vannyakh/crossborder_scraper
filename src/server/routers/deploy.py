"""Deploy / VPS network access API for the settings panel."""

from fastapi import Depends

from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas.network import (
    NetworkAccessApplyRequest,
    NetworkAccessApplyResponse,
    NetworkAccessSetupRequest,
    NetworkAccessSetupResponse,
    NetworkAccessStatusResponse,
)
from server.services.network_access import get_network_access_service

router = protected_router(prefix="/deploy", tags=["deploy"])


@router.get("/network", response_model=NetworkAccessStatusResponse)
async def get_network_access() -> NetworkAccessStatusResponse:
    """Panel bind, host firewall, and cloud security group checklist."""
    return NetworkAccessStatusResponse(**get_network_access_service().get_status())


@router.post("/network/firewall", response_model=NetworkAccessApplyResponse)
async def apply_host_firewall(
    body: NetworkAccessApplyRequest | None = None,
    username: str = Depends(require_panel_auth),
) -> NetworkAccessApplyResponse:
    """Open panel TCP port in ufw / firewalld (root or passwordless sudo)."""
    payload = body or NetworkAccessApplyRequest()
    result = get_network_access_service().apply_host_firewall(
        port=payload.port,
        enable_ufw=payload.enable_ufw,
        username=username,
    )
    return NetworkAccessApplyResponse(**result)


@router.post("/network/setup", response_model=NetworkAccessSetupResponse)
async def setup_network_access(
    body: NetworkAccessSetupRequest | None = None,
    username: str = Depends(require_panel_auth),
) -> NetworkAccessSetupResponse:
    """
    Full VPS access setup: bind 0.0.0.0, host firewall, public IP in .env.

    Restart the panel after setup if bind settings changed.
    """
    payload = body or NetworkAccessSetupRequest()
    result = get_network_access_service().run_full_setup(
        port=payload.port,
        ensure_bind=payload.ensure_bind,
        enable_ufw=payload.enable_ufw,
        open_firewall=payload.open_firewall,
        persist_external=payload.persist_external,
        username=username,
    )
    return NetworkAccessSetupResponse(**result)
