"""Database platform driver registry — dispatch by engine plugin id."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from server.app_store.catalog import StorePluginDefinition
from server.db_engines.base import DatabasePlatformDriver, EngineRuntimeContext
from server.db_engines.catalog import (
    admin_config,
    list_databases_from_record,
    validate_db_name,
)
from server.db_engines.platforms import get_logical_driver, get_platform_meta
from server.db_engines.runtime import resolve_admin_credentials

_CACHE_PLATFORM_IDS = frozenset({"redis"})


def get_driver(plugin_id: str) -> DatabasePlatformDriver | None:
    return get_logical_driver(plugin_id)


def supports_multiple_databases(plugin_id: str) -> bool:
    meta = get_platform_meta(plugin_id)
    return bool(meta and meta.supports_logical_create)


def list_platform_ids() -> list[str]:
    from server.db_engines.platforms import list_logical_platform_ids

    return list_logical_platform_ids()


def runtime_context(plugin: StorePluginDefinition, record: dict[str, Any]) -> EngineRuntimeContext:
    config = admin_config(record)
    admin_user, admin_password = resolve_admin_credentials(plugin, record, config)
    if not admin_password:
        raise HTTPException(status_code=400, detail="admin password missing for this service")
    container = None
    if record.get("mode") == "docker":
        container = str(config.get("container_name") or plugin.container_name)
    return EngineRuntimeContext(
        plugin_id=plugin.id,
        mode=str(record.get("mode") or ""),
        container=container,
        admin_user=admin_user,
        admin_password=admin_password,
        config=config,
    )


def provision_database(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    username: str,
    password: str,
    charset: str = "utf8mb4",
    access: str = "local",
) -> None:
    driver = get_driver(plugin.id)
    if not driver:
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support creating logical databases from the panel",
        )
    ctx = runtime_context(plugin, record)
    driver.provision_logical(
        ctx,
        db_name=db_name,
        username=username,
        password=password,
        charset=charset,
        access=access,
    )


def drop_database(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    username: str | None = None,
) -> None:
    driver = get_driver(plugin.id)
    if not driver:
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support dropping logical databases from the panel",
        )
    name = validate_db_name(db_name)
    rows = list_databases_from_record(record)
    match = next((row for row in rows if str(row.get("name")) == name), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"database {name} not found")

    user = str(username or match.get("username") or "").strip()
    if not user:
        raise HTTPException(status_code=400, detail="database user is unknown; cannot drop safely")

    ctx = runtime_context(plugin, record)
    driver.drop_logical(ctx, db_name=name, username=user)


def optimize_database(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
) -> None:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "optimize_logical"):
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support database optimize from the panel",
        )
    name = validate_db_name(db_name)
    ctx = runtime_context(plugin, record)
    driver.optimize_logical(ctx, db_name=name)  # type: ignore[attr-defined]


def update_logical_database(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    password: str | None = None,
    access: str | None = None,
) -> None:
    driver = get_driver(plugin.id)
    if not driver:
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support updating logical databases from the panel",
        )
    name = validate_db_name(db_name)
    rows = list_databases_from_record(record)
    match = next((row for row in rows if str(row.get("name")) == name), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"database {name} not found")

    username = str(match.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="database user is unknown")
    current_password = str(match.get("password") or "")
    current_access = str(match.get("access") or "local")
    next_password = password if password is not None else current_password
    next_access = access if access is not None else current_access
    if not next_password:
        raise HTTPException(status_code=400, detail="password is required")

    ctx = runtime_context(plugin, record)
    if access is not None and hasattr(driver, "set_logical_access"):
        driver.set_logical_access(  # type: ignore[attr-defined]
            ctx,
            db_name=name,
            username=username,
            password=next_password,
            access=next_access,
        )
    elif password is not None and hasattr(driver, "set_logical_password"):
        driver.set_logical_password(  # type: ignore[attr-defined]
            ctx,
            username=username,
            password=next_password,
            access=next_access,
        )
    else:
        raise HTTPException(status_code=400, detail="no supported update for this engine")


def list_provider_catalog() -> list[dict[str, Any]]:
    """Panel-facing database provider metadata (engines + cache services)."""
    from server.app_store import state
    from server.app_store.catalog import list_catalog
    from server.db_engines.platforms import list_logical_platform_ids

    logical_ids = set(list_logical_platform_ids())
    installed = state.list_installed()
    items: list[dict[str, Any]] = []
    for entry in list_catalog():
        pid = str(entry.get("id") or "")
        category = str(entry.get("category") or "")
        if (
            category not in ("database", "cache")
            and pid not in logical_ids
            and pid not in _CACHE_PLATFORM_IDS
        ):
            continue
        inst = installed.get(pid) or {}
        driver = get_driver(pid)
        items.append(
            {
                "id": pid,
                "label": str(entry.get("name") or pid),
                "category": category,
                "default_port": int(entry.get("default_port") or 0),
                "supports_docker": bool(entry.get("supports_docker")),
                "supports_external": bool(entry.get("supports_external")),
                "supports_native": bool(entry.get("supports_native")),
                "supports_logical_create": driver is not None,
                "supports_managed_connection": True,
                "installed": pid in installed,
                "status": inst.get("status") if inst else "not_installed",
                "mode": inst.get("mode"),
                "default_version": entry.get("default_version"),
                "available_versions": list(entry.get("available_versions") or []),
            }
        )
    return items
