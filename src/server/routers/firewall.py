from fastapi import Depends, HTTPException

from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas.firewall import (
    FirewallActionResponse,
    FirewallExportResponse,
    FirewallGroupListResponse,
    FirewallGroupUpsertRequest,
    FirewallIcmpRequest,
    FirewallImportRequest,
    FirewallRuleCreateRequest,
    FirewallRuleListResponse,
    FirewallStatusResponse,
    FirewallToggleRequest,
)
from server.services.audit import log_operation
from server.services.firewall_service import get_firewall_service

router = protected_router(prefix="/firewall", tags=["firewall"])


@router.get("/status", response_model=FirewallStatusResponse)
async def firewall_status() -> FirewallStatusResponse:
    return FirewallStatusResponse(**get_firewall_service().get_status())


@router.get("/rules", response_model=FirewallRuleListResponse)
async def firewall_rules() -> FirewallRuleListResponse:
    return FirewallRuleListResponse(**get_firewall_service().list_rules())


@router.get("/groups", response_model=FirewallGroupListResponse)
async def firewall_groups() -> FirewallGroupListResponse:
    return FirewallGroupListResponse(**get_firewall_service().list_groups())


@router.post("/rules", response_model=FirewallActionResponse)
async def create_firewall_rule(
    body: FirewallRuleCreateRequest,
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = get_firewall_service().create_rule(body.model_dump())
    log_operation(
        user=username,
        operation_type="Firewall rule",
        details=f"Add {body.protocol} {body.port} {body.action} {body.direction}",
    )
    return FirewallActionResponse(**result)


@router.delete("/rules/{rule_id}", response_model=FirewallActionResponse)
async def delete_firewall_rule(
    rule_id: str,
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = get_firewall_service().delete_rule(rule_id)
    log_operation(user=username, operation_type="Firewall rule", details=f"Delete {rule_id}")
    return FirewallActionResponse(**result)


@router.post("/enable", response_model=FirewallActionResponse)
async def set_firewall_enabled(
    body: FirewallToggleRequest,
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = get_firewall_service().set_enabled(enabled=body.enabled)
    log_operation(
        user=username,
        operation_type="Firewall",
        details="enabled" if body.enabled else "disabled",
    )
    return FirewallActionResponse(**result)


@router.post("/icmp", response_model=FirewallActionResponse)
async def set_firewall_icmp(
    body: FirewallIcmpRequest,
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = get_firewall_service().set_block_icmp(block=body.block)
    log_operation(user=username, operation_type="Firewall ICMP", details=f"block={body.block}")
    return FirewallActionResponse(**result)


@router.post("/install", response_model=FirewallActionResponse)
async def install_firewall_ufw(
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = await get_firewall_service().install_ufw()
    log_operation(user=username, operation_type="Firewall install", details="ufw package")
    return FirewallActionResponse(
        ok=result.get("ok", False),
        messages=result.get("messages") or [],
        status=FirewallStatusResponse(**result["status"]) if result.get("status") else None,
    )


@router.post("/groups", response_model=FirewallGroupListResponse)
async def upsert_firewall_group(
    body: FirewallGroupUpsertRequest,
    username: str = Depends(require_panel_auth),
) -> FirewallGroupListResponse:
    try:
        data = get_firewall_service().upsert_group(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_operation(user=username, operation_type="Firewall group", details=f"Upsert {body.id}")
    return FirewallGroupListResponse(**data)


@router.delete("/groups/{group_id}", response_model=FirewallGroupListResponse)
async def delete_firewall_group(
    group_id: str,
    username: str = Depends(require_panel_auth),
) -> FirewallGroupListResponse:
    data = get_firewall_service().delete_group(group_id)
    log_operation(user=username, operation_type="Firewall group", details=f"Delete {group_id}")
    return FirewallGroupListResponse(**data)


@router.get("/export", response_model=FirewallExportResponse)
async def export_firewall_rules() -> FirewallExportResponse:
    return FirewallExportResponse(**get_firewall_service().export_rules())


@router.post("/import", response_model=FirewallActionResponse)
async def import_firewall_rules(
    body: FirewallImportRequest,
    username: str = Depends(require_panel_auth),
) -> FirewallActionResponse:
    result = get_firewall_service().import_rules(body.model_dump(exclude_unset=True))
    log_operation(user=username, operation_type="Firewall import", details="rules import")
    return FirewallActionResponse(**result)
