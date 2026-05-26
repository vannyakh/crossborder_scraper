from datetime import datetime

from config.ui_store import load_marketplaces_config
from export.registry import EXPORTERS, get_exporter
from server.deps import protected_router
from server.manager import get_manager
from server.schemas import MarketplaceInfo, MarketplaceListResponse, RuntimeStatusResponse

router = protected_router(tags=["runtime"])
SERVICE_STARTED_AT = datetime.utcnow()


@router.get("/runtime/status", response_model=RuntimeStatusResponse)
async def runtime_status() -> RuntimeStatusResponse:
    mgr = get_manager()
    data = mgr.get_runtime_status(started_at=SERVICE_STARTED_AT)
    return RuntimeStatusResponse(**data)


@router.get("/export/marketplaces", response_model=MarketplaceListResponse)
async def list_marketplaces() -> MarketplaceListResponse:
    configured = load_marketplaces_config()
    items: list[MarketplaceInfo] = []
    seen: set[str] = set()

    for key in EXPORTERS:
        exporter = get_exporter(key)  # type: ignore[arg-type]
        entry = configured.get(key, {})
        items.append(
            MarketplaceInfo(
                id=key,
                label=entry.get("label") or key,
                configured=exporter.validate_credentials(),
                supports_export=True,
            )
        )
        seen.add(key)

    for platform_id, entry in configured.items():
        if platform_id in seen:
            continue
        creds = entry.get("credentials") or {}
        has_creds = any(v for v in creds.values() if v)
        items.append(
            MarketplaceInfo(
                id=platform_id,
                label=entry.get("label") or platform_id,
                configured=bool(entry.get("enabled") and has_creds),
                supports_export=False,
            )
        )

    return MarketplaceListResponse(items=items)
