from typing import Any

from fastapi import Depends, HTTPException

from core.plugins import get_source_spec
from server.app_store import get_store_manager
from server.auth import require_panel_auth
from server.deps import protected_router
from server.schemas import (
    DatabaseActionResponse,
    DatabaseAddColumnRequest,
    DatabaseColumnsResponse,
    DatabaseCreateTableRequest,
    DatabaseInsertRowRequest,
    DatabaseInstallOptionsResponse,
    DatabaseProvidersResponse,
    DatabaseQueryRequest,
    DatabaseQueryResponse,
    DatabaseSqlCompleteResponse,
    DatabaseTablesResponse,
    MessageResponse,
    StoreCatalogResponse,
    StoreConnectRequest,
    StoreCreateDatabasesRequest,
    StoreDatabasePatchRequest,
    StoreEnvironmentResponse,
    StoreInstalledListResponse,
    StoreInstalledResponse,
    StoreInstallRequest,
    StoreManagedDatabaseResponse,
    StorePluginCredentialsResponse,
    StorePluginDetailResponse,
    StoreUpdateConfigRequest,
)
from server.services.audit import log_operation
from server.services.database_engine import (
    get_database_engine_service,
    get_database_install_options,
    list_database_providers,
)

router = protected_router(prefix="/store", tags=["store"])


@router.get("/environment", response_model=StoreEnvironmentResponse)
async def store_environment() -> StoreEnvironmentResponse:
    return StoreEnvironmentResponse(**get_store_manager().get_environment())


@router.get("/catalog", response_model=StoreCatalogResponse)
async def store_catalog() -> StoreCatalogResponse:
    items = get_store_manager().list_catalog()
    return StoreCatalogResponse(items=items, total=len(items))


@router.get("/installed", response_model=StoreInstalledListResponse)
async def store_installed() -> StoreInstalledListResponse:
    items = get_store_manager().list_installed()
    return StoreInstalledListResponse(items=items, total=len(items))


@router.get("/plugins/{plugin_id}", response_model=StorePluginDetailResponse)
async def store_plugin_detail(plugin_id: str) -> StorePluginDetailResponse:
    return StorePluginDetailResponse(**get_store_manager().get_plugin_detail(plugin_id))


@router.get("/plugins/{plugin_id}/status", response_model=StoreInstalledResponse)
async def store_plugin_status(plugin_id: str) -> StoreInstalledResponse:
    return StoreInstalledResponse(**await get_store_manager().refresh_status(plugin_id))


@router.post("/plugins/{plugin_id}/install", response_model=StoreInstalledResponse)
async def store_install(
    plugin_id: str,
    body: StoreInstallRequest,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    if get_source_spec(plugin_id):
        result = await get_store_manager().enable_source(plugin_id)
        log_operation(
            user=username,
            operation_type="Store enable source",
            details=f"Enabled source plugin {plugin_id}",
            meta={"plugin_id": plugin_id, "mode": "source"},
        )
        return StoreInstalledResponse(**result)

    if body.mode == "docker":
        result = await get_store_manager().install_docker(
            plugin_id,
            port=body.port,
            version=body.version,
        )
        log_operation(
            user=username,
            operation_type="Store install",
            details=(
                f"Installed {plugin_id} via Docker "
                f"v{result['config'].get('driver_version')} "
                f"on port {result['config'].get('port')}"
            ),
            meta={"plugin_id": plugin_id, "mode": "docker"},
        )
        return StoreInstalledResponse(**result)

    if body.mode == "native":
        result = await get_store_manager().install_native(
            plugin_id,
            port=body.port,
            version=body.version,
        )
        log_operation(
            user=username,
            operation_type="Store install",
            details=(
                f"Installed {plugin_id} native driver "
                f"v{result['config'].get('driver_version')} "
                f"on port {result['config'].get('port')}"
            ),
            meta={"plugin_id": plugin_id, "mode": "native"},
        )
        return StoreInstalledResponse(**result)

    raise HTTPException(status_code=400, detail="use POST /connect for external mode")


@router.post("/plugins/{plugin_id}/connect", response_model=StoreInstalledResponse)
async def store_connect(
    plugin_id: str,
    body: StoreConnectRequest,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    config: dict[str, Any] = body.model_dump(exclude_unset=True)
    result = await get_store_manager().connect_external(plugin_id, config)
    log_operation(
        user=username,
        operation_type="Store connect",
        details=f"Connected external {plugin_id} at {config.get('host')}:{config.get('port')}",
        meta={"plugin_id": plugin_id, "mode": "external"},
    )
    return StoreInstalledResponse(**result)


@router.get("/plugins/{plugin_id}/credentials", response_model=StorePluginCredentialsResponse)
async def store_plugin_credentials(
    plugin_id: str,
    _username: str = Depends(require_panel_auth),
) -> StorePluginCredentialsResponse:
    return StorePluginCredentialsResponse(**get_store_manager().get_credentials(plugin_id))


@router.get("/database-providers", response_model=DatabaseProvidersResponse)
async def store_database_providers(
    _username: str = Depends(require_panel_auth),
) -> DatabaseProvidersResponse:
    items = list_database_providers()
    return DatabaseProvidersResponse(items=items, total=len(items))


@router.get(
    "/database-providers/{plugin_id}/install-options",
    response_model=DatabaseInstallOptionsResponse,
)
async def store_database_install_options(
    plugin_id: str,
    _username: str = Depends(require_panel_auth),
) -> DatabaseInstallOptionsResponse:
    try:
        return DatabaseInstallOptionsResponse(**get_database_install_options(plugin_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/plugins/{plugin_id}/databases", response_model=StoreManagedDatabaseResponse)
async def store_managed_database(
    plugin_id: str,
    _username: str = Depends(require_panel_auth),
) -> StoreManagedDatabaseResponse:
    return StoreManagedDatabaseResponse(**get_database_engine_service().get_managed_view(plugin_id))


@router.post("/plugins/{plugin_id}/databases", response_model=StoreManagedDatabaseResponse)
async def store_create_databases(
    plugin_id: str,
    body: StoreCreateDatabasesRequest,
    username: str = Depends(require_panel_auth),
) -> StoreManagedDatabaseResponse:
    payload = [item.model_dump() for item in body.databases]
    names = ", ".join(str(item.get("name") or "") for item in payload)
    await get_database_engine_service().create_logical_databases(plugin_id, payload)
    log_operation(
        user=username,
        operation_type="Store create databases",
        details=f"Created database(s) on {plugin_id}: {names}",
        meta={"plugin_id": plugin_id, "count": len(payload)},
    )
    return StoreManagedDatabaseResponse(**get_database_engine_service().get_managed_view(plugin_id))


@router.delete("/plugins/{plugin_id}/databases/{database_name}")
async def store_drop_database(
    plugin_id: str,
    database_name: str,
    username: str = Depends(require_panel_auth),
) -> dict[str, Any]:
    result = await get_database_engine_service().drop_logical_database(plugin_id, database_name)
    log_operation(
        user=username,
        operation_type="Store drop database",
        details=f"Dropped database {database_name} on {plugin_id}",
        meta={"plugin_id": plugin_id, "database": database_name},
    )
    return result


@router.post("/plugins/{plugin_id}/databases/{database_name}/optimize")
async def store_optimize_database(
    plugin_id: str,
    database_name: str,
    username: str = Depends(require_panel_auth),
) -> dict[str, Any]:
    result = await get_database_engine_service().optimize_logical_database(plugin_id, database_name)
    log_operation(
        user=username,
        operation_type="Store optimize database",
        details=f"Optimized database {database_name} on {plugin_id}",
        meta={"plugin_id": plugin_id, "database": database_name},
    )
    return result


@router.get(
    "/plugins/{plugin_id}/databases/{database_name}/tables",
    response_model=DatabaseTablesResponse,
)
async def store_database_tables(
    plugin_id: str,
    database_name: str,
    _username: str = Depends(require_panel_auth),
) -> DatabaseTablesResponse:
    payload = await get_database_engine_service().list_database_tables(plugin_id, database_name)
    return DatabaseTablesResponse(**payload)


@router.post(
    "/plugins/{plugin_id}/databases/{database_name}/query",
    response_model=DatabaseQueryResponse,
)
async def store_database_query(
    plugin_id: str,
    database_name: str,
    body: DatabaseQueryRequest,
    username: str = Depends(require_panel_auth),
) -> DatabaseQueryResponse:
    result = await get_database_engine_service().run_database_query(
        plugin_id,
        database_name,
        sql=body.sql,
        limit=body.limit,
    )
    log_operation(
        user=username,
        operation_type="Store database query",
        details=result.get("message") or f"SQL on {database_name} ({plugin_id})",
        meta={
            "plugin_id": plugin_id,
            "database": database_name,
            "ok": result.get("ok"),
            "row_count": result.get("row_count"),
            "error": result.get("error"),
        },
    )
    return DatabaseQueryResponse(**result)


@router.get(
    "/plugins/{plugin_id}/databases/{database_name}/sql-complete",
    response_model=DatabaseSqlCompleteResponse,
)
async def store_database_sql_complete(
    plugin_id: str,
    database_name: str,
    prefix: str = "",
    table: str | None = None,
    _username: str = Depends(require_panel_auth),
) -> DatabaseSqlCompleteResponse:
    payload = await get_database_engine_service().sql_complete(
        plugin_id,
        database_name,
        prefix=prefix,
        table_name=table,
    )
    return DatabaseSqlCompleteResponse(**payload)


@router.get(
    "/plugins/{plugin_id}/databases/{database_name}/tables/{table_name}/columns",
    response_model=DatabaseColumnsResponse,
)
async def store_database_table_columns(
    plugin_id: str,
    database_name: str,
    table_name: str,
    _username: str = Depends(require_panel_auth),
) -> DatabaseColumnsResponse:
    payload = await get_database_engine_service().list_table_columns(
        plugin_id, database_name, table_name
    )
    return DatabaseColumnsResponse(**payload)


@router.post(
    "/plugins/{plugin_id}/databases/{database_name}/tables",
    response_model=DatabaseActionResponse,
)
async def store_create_database_table(
    plugin_id: str,
    database_name: str,
    body: DatabaseCreateTableRequest,
    username: str = Depends(require_panel_auth),
) -> DatabaseActionResponse:
    result = await get_database_engine_service().create_database_table(
        plugin_id,
        database_name,
        table_name=body.table_name,
        columns=[c.model_dump() for c in body.columns],
    )
    log_operation(
        user=username,
        operation_type="Store create database table",
        details=result.get("message") or f"Created table {body.table_name}",
        meta={"plugin_id": plugin_id, "database": database_name, "table": body.table_name},
    )
    return DatabaseActionResponse(**result)


@router.post(
    "/plugins/{plugin_id}/databases/{database_name}/tables/{table_name}/columns",
    response_model=DatabaseActionResponse,
)
async def store_add_database_column(
    plugin_id: str,
    database_name: str,
    table_name: str,
    body: DatabaseAddColumnRequest,
    username: str = Depends(require_panel_auth),
) -> DatabaseActionResponse:
    result = await get_database_engine_service().add_table_column(
        plugin_id,
        database_name,
        table_name,
        column_name=body.column_name,
        column_type=body.column_type,
        nullable=body.nullable,
        default=body.default,
    )
    log_operation(
        user=username,
        operation_type="Store add database column",
        details=result.get("message") or f"Added column {body.column_name}",
        meta={
            "plugin_id": plugin_id,
            "database": database_name,
            "table": table_name,
            "column": body.column_name,
        },
    )
    return DatabaseActionResponse(**result)


@router.post(
    "/plugins/{plugin_id}/databases/{database_name}/tables/{table_name}/rows",
    response_model=DatabaseActionResponse,
)
async def store_insert_database_row(
    plugin_id: str,
    database_name: str,
    table_name: str,
    body: DatabaseInsertRowRequest,
    username: str = Depends(require_panel_auth),
) -> DatabaseActionResponse:
    result = await get_database_engine_service().insert_table_row(
        plugin_id,
        database_name,
        table_name,
        values=body.values,
    )
    log_operation(
        user=username,
        operation_type="Store insert database row",
        details=result.get("message") or f"Inserted row into {table_name}",
        meta={"plugin_id": plugin_id, "database": database_name, "table": table_name},
    )
    return DatabaseActionResponse(**result)


@router.patch(
    "/plugins/{plugin_id}/databases/{database_name}", response_model=StoreManagedDatabaseResponse
)
async def store_patch_database(
    plugin_id: str,
    database_name: str,
    body: StoreDatabasePatchRequest,
    username: str = Depends(require_panel_auth),
) -> StoreManagedDatabaseResponse:
    patch = body.model_dump(exclude_unset=True)
    view = await get_database_engine_service().patch_logical_database(
        plugin_id, database_name, patch
    )
    log_operation(
        user=username,
        operation_type="Store update database",
        details=f"Updated database {database_name} on {plugin_id}",
        meta={"plugin_id": plugin_id, "database": database_name, "fields": list(patch.keys())},
    )
    return StoreManagedDatabaseResponse(**view)


@router.patch("/plugins/{plugin_id}/config", response_model=StoreInstalledResponse)
async def store_update_config(
    plugin_id: str,
    body: StoreUpdateConfigRequest,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    patch: dict[str, Any] = body.model_dump(exclude_unset=True)
    result = await get_database_engine_service().update_connection_config(plugin_id, patch)
    cfg = result["config"]
    endpoint = f"{cfg.get('host')}:{cfg.get('port')}"
    log_operation(
        user=username,
        operation_type="Store update config",
        details=f"Updated {plugin_id} connection at {endpoint}",
        meta={"plugin_id": plugin_id, "mode": result.get("mode")},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/start", response_model=StoreInstalledResponse)
async def store_start(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().start(plugin_id)
    log_operation(
        user=username,
        operation_type="Store start",
        details=f"Started {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/stop", response_model=StoreInstalledResponse)
async def store_stop(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().stop(plugin_id)
    log_operation(
        user=username,
        operation_type="Store stop",
        details=f"Stopped {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.post("/plugins/{plugin_id}/restart", response_model=StoreInstalledResponse)
async def store_restart(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> StoreInstalledResponse:
    result = await get_store_manager().restart(plugin_id)
    log_operation(
        user=username,
        operation_type="Store restart",
        details=f"Restarted {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return StoreInstalledResponse(**result)


@router.delete("/plugins/{plugin_id}", response_model=MessageResponse)
async def store_uninstall(
    plugin_id: str,
    username: str = Depends(require_panel_auth),
) -> MessageResponse:
    await get_store_manager().uninstall(plugin_id)
    log_operation(
        user=username,
        operation_type="Store uninstall",
        details=f"Removed {plugin_id}",
        meta={"plugin_id": plugin_id},
    )
    return MessageResponse(message=f"{plugin_id} uninstalled")
