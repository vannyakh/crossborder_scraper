from fastapi import Depends, File, HTTPException, Query, UploadFile

from core.plugins import (
    PluginSecurityError,
    STANDARD_DATA_FIELDS,
    get_plugin_installer,
    get_plugin_manager,
    list_source_catalog,
    supported_source_labels,
)
from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas import (
    PluginInstallResponse,
    PluginScrapeSpecificationsResponse,
    PluginSecurityPolicyResponse,
    PluginUninstallResponse,
)
from server.services.audit import log_operation
from server.store import state

router = protected_router(prefix="/plugins", tags=["plugins"])


@router.get("/security/policy", response_model=PluginSecurityPolicyResponse)
async def plugin_security_policy(
    _username: str = Depends(require_panel_auth),
) -> PluginSecurityPolicyResponse:
    mgr = get_plugin_manager()
    return PluginSecurityPolicyResponse(**mgr.security_policy_dict())


@router.get("/specifications", response_model=PluginScrapeSpecificationsResponse)
async def list_scrape_specifications(
    _username: str = Depends(require_panel_auth),
) -> PluginScrapeSpecificationsResponse:
    """E-commerce / social scrape plugin specifications for the App Store UI."""
    mgr = get_plugin_manager()
    items = mgr.list_scrape_specifications()
    return PluginScrapeSpecificationsResponse(
        items=items,
        total=len(items),
        standard_data_fields=list(STANDARD_DATA_FIELDS),
    )


@router.get("/sources")
async def list_source_plugins(_username: str = Depends(require_panel_auth)) -> dict:
    mgr = get_plugin_manager()
    installed = state.list_installed()
    items = list_source_catalog(installed_ids=set(installed.keys()))
    return {
        "items": items,
        "total": len(items),
        "supported_labels": supported_source_labels(),
        "plugins_dir": str(mgr.plugins_dir),
        "installed_root": str(mgr.installed_root),
    }


@router.get("/sources/{plugin_id}")
async def source_plugin_detail(
    plugin_id: str,
    _username: str = Depends(require_panel_auth),
) -> dict:
    from server.store import get_store_manager

    return get_store_manager().get_plugin_detail(plugin_id)


@router.get("/installed")
async def list_installed_plugins(_username: str = Depends(require_panel_auth)) -> dict:
    mgr = get_plugin_manager()
    items = []
    for spec in mgr.list_installed_specs():
        record = state.get_installed(spec.id) or {}
        items.append(
            {
                "plugin_id": spec.id,
                "name": spec.manifest.name,
                "version": spec.manifest.version,
                "domains": list(spec.manifest.domains),
                "sandboxed": True,
                "status": record.get("status", "installed"),
                "permissions": spec.manifest.permissions.to_dict(),
                "workspace": str(spec.workspace),
            }
        )
    return {"items": items, "total": len(items)}


@router.post("/install", response_model=PluginInstallResponse)
async def install_plugin_zip(
    file: UploadFile = File(...),
    replace: bool = Query(False),
    username: str = Depends(require_panel_auth),
) -> PluginInstallResponse:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="only .zip archives are accepted")

    data = await file.read()
    installer = get_plugin_installer()

    try:
        result = installer.install_zip(data, replace=replace)
    except PluginSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    log_operation(
        user=username,
        operation_type="Plugin install",
        details=f"Installed sandboxed plugin {result.get('plugin_id')}",
        meta=result,
    )
    return PluginInstallResponse(**result)


@router.delete("/installed/{plugin_id}", response_model=PluginUninstallResponse)
async def uninstall_plugin(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> PluginUninstallResponse:
    installer = get_plugin_installer()
    try:
        result = installer.uninstall(plugin_id)
    except PluginSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    log_operation(
        user=username,
        operation_type="Plugin uninstall",
        details=f"Removed sandboxed plugin {plugin_id}",
        meta=result,
    )
    return PluginUninstallResponse(**result)
