"""Panel-managed database engines — managed view, config, and logical DB lifecycle."""

from __future__ import annotations

import asyncio
import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from deploy.drivers import install as driver_install
from server.app_store import docker, probes, state
from server.app_store.catalog import StorePluginDefinition, get_plugin
from server.db_engines import catalog, inspect, registry

_service: DatabaseEngineService | None = None


def _generate_password() -> str:
    return secrets.token_urlsafe(18)


def _store_manager():
    from server.app_store.manager import get_store_manager

    return get_store_manager()


class DatabaseEngineService:
    """Managed-database operations for App Store engine plugins."""

    def _require_installed(self, plugin_id: str) -> dict[str, Any]:
        record = state.get_installed(plugin_id)
        if not record:
            raise HTTPException(status_code=404, detail=f"plugin {plugin_id} is not installed")
        return record

    def _require_plugin(self, plugin_id: str) -> StorePluginDefinition:
        plugin = get_plugin(plugin_id)
        if not plugin:
            raise HTTPException(status_code=404, detail=f"unknown plugin {plugin_id}")
        return plugin

    def _ensure_database_catalog(self, plugin_id: str, record: dict[str, Any]) -> dict[str, Any]:
        from server.app_store.manager import _seed_default_database

        config = dict(record.get("config") or {})
        if not isinstance(config.get("databases"), list) and config.get("database"):
            config = _seed_default_database(config)
            record = state.touch_record(record, config=config)
            state.save_installed(plugin_id, record)
        return record

    def get_managed_view(self, plugin_id: str) -> dict[str, Any]:
        record = self._ensure_database_catalog(plugin_id, self._require_installed(plugin_id))
        plugin = get_plugin(plugin_id)
        config = dict(record.get("config") or {})
        all_rows = catalog.list_databases_from_record(record)
        items = [catalog.public_database_entry(row) for row in all_rows if row.get("name")]
        managed_raw = catalog.resolve_managed_database(record)
        managed_name = str(managed_raw.get("name")) if managed_raw else ""
        extra = sum(1 for row in all_rows if str(row.get("name")) != managed_name)
        managed = (
            catalog.public_database_entry(managed_raw)
            if managed_raw and managed_raw.get("name")
            else None
        )
        driver = registry.get_driver(plugin_id) if plugin else None
        supports_optimize = bool(driver and hasattr(driver, "optimize_logical"))
        supports_permission = plugin_id == "mysql"
        supports_inspect = bool(driver and hasattr(driver, "list_tables"))
        return {
            "plugin_id": plugin_id,
            "managed": managed,
            "items": items,
            "total": len(items),
            "connection": {
                "host": str(config.get("host") or "127.0.0.1"),
                "port": config.get("port"),
                "username": config.get("username"),
                "database": config.get("database"),
                "password_set": bool(config.get("password")),
                "mode": record.get("mode"),
                "container_name": config.get("container_name"),
                "status": record.get("status"),
            },
            "supports_create": bool(plugin and registry.supports_multiple_databases(plugin.id)),
            "extra_logical_count": extra,
            "supports_optimize": supports_optimize,
            "supports_permission": supports_permission,
            "supports_inspect": supports_inspect,
        }

    async def create_logical_databases(
        self, plugin_id: str, items: list[dict[str, Any]]
    ) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        config = dict(record.get("config") or {})
        databases = list(catalog.list_databases_from_record(record))
        if not isinstance(config.get("databases"), list):
            config["databases"] = [
                {
                    "name": str(row["name"]),
                    "username": row.get("username"),
                    "password": row.get("password"),
                    "charset": row.get("charset") or "utf8mb4",
                    "created_at": row.get("created_at"),
                }
                for row in databases
            ]
            databases = list(config["databases"])

        existing = {str(row.get("name")) for row in databases}
        for raw in items:
            name = catalog.validate_db_name(str(raw.get("name") or ""))
            if name in existing:
                raise HTTPException(status_code=409, detail=f"database {name} already exists")
            username = str(raw.get("username") or "").strip() or catalog.generate_db_username()
            password = str(raw.get("password") or "").strip() or catalog.generate_db_password()
            charset = str(raw.get("charset") or "utf8mb4")
            access = str(raw.get("access") or "local").strip().lower()
            if access not in ("local", "remote"):
                raise HTTPException(status_code=400, detail="access must be local or remote")

            await asyncio.to_thread(
                registry.provision_database,
                plugin,
                record,
                db_name=name,
                username=username,
                password=password,
                charset=charset,
                access=access,
            )
            entry = {
                "name": name,
                "username": username,
                "password": password,
                "charset": charset,
                "access": access,
                "created_at": datetime.now(UTC).isoformat(),
            }
            databases.append(entry)
            existing.add(name)

        config["databases"] = databases
        record = state.touch_record(record, config=config)
        state.save_installed(plugin_id, record)
        return self.get_managed_view(plugin_id)

    async def drop_logical_database(self, plugin_id: str, database_name: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        config = dict(record.get("config") or {})
        databases = list(catalog.list_databases_from_record(record))
        match = next((row for row in databases if str(row.get("name")) == name), None)
        if not match:
            raise HTTPException(status_code=404, detail=f"database {name} not found")

        username = str(match.get("username") or "")
        await asyncio.to_thread(
            registry.drop_database,
            plugin,
            record,
            db_name=name,
            username=username or None,
        )

        remaining = [row for row in databases if str(row.get("name")) != name]
        config["databases"] = [
            {
                "name": str(row["name"]),
                "username": row.get("username"),
                "password": row.get("password"),
                "charset": row.get("charset") or "utf8mb4",
                "access": row.get("access") or "local",
                "created_at": row.get("created_at"),
            }
            for row in remaining
        ]
        if str(config.get("database") or "") == name:
            config.pop("database", None)
            if remaining:
                primary = remaining[0]
                config["database"] = str(primary.get("name"))
                if primary.get("username"):
                    config["username"] = primary.get("username")
                if primary.get("password"):
                    config["password"] = primary.get("password")
        record = state.touch_record(record, config=config)
        state.save_installed(plugin_id, record)
        return {"plugin_id": plugin_id, "name": name, "dropped": True}

    async def optimize_logical_database(self, plugin_id: str, database_name: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        await asyncio.to_thread(registry.optimize_database, plugin, record, db_name=name)
        return {"plugin_id": plugin_id, "name": name, "optimized": True}

    async def patch_logical_database(
        self, plugin_id: str, database_name: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        rows = list(catalog.list_databases_from_record(record))
        match = next((row for row in rows if str(row.get("name")) == name), None)
        if not match:
            raise HTTPException(status_code=404, detail=f"database {name} not found")

        password: str | None = None
        if patch.get("regenerate_password"):
            password = catalog.generate_db_password()
        elif patch.get("password"):
            password = str(patch["password"]).strip() or None

        access = patch.get("access")
        if access is not None:
            access = str(access).strip().lower()
            if access not in ("local", "remote"):
                raise HTTPException(status_code=400, detail="access must be local or remote")

        await asyncio.to_thread(
            registry.update_logical_database,
            plugin,
            record,
            db_name=name,
            password=password,
            access=access,
        )

        config = dict(record.get("config") or {})
        databases = list(catalog.list_databases_from_record(record))
        updated: list[dict[str, Any]] = []
        for row in databases:
            copy = dict(row)
            if str(copy.get("name")) == name:
                if password is not None:
                    copy["password"] = password
                if access is not None:
                    copy["access"] = access
            updated.append(copy)
        config["databases"] = [
            {
                "name": str(row["name"]),
                "username": row.get("username"),
                "password": row.get("password"),
                "charset": row.get("charset") or "utf8mb4",
                "access": row.get("access") or "local",
                "created_at": row.get("created_at"),
            }
            for row in updated
        ]
        primary = str(config.get("database") or "")
        if primary == name:
            match_row = next((r for r in updated if str(r.get("name")) == name), None)
            if match_row:
                if password is not None and match_row.get("password"):
                    config["password"] = match_row.get("password")
                if match_row.get("username"):
                    config["username"] = match_row.get("username")
        record = state.touch_record(record, config=config)
        state.save_installed(plugin_id, record)
        return self.get_managed_view(plugin_id)

    async def list_database_tables(self, plugin_id: str, database_name: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        return await asyncio.to_thread(
            inspect.tables_payload,
            plugin,
            record,
            db_name=name,
        )

    async def run_database_query(
        self,
        plugin_id: str,
        database_name: str,
        *,
        sql: str,
        limit: int,
    ) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        from server.db_engines import sql_management

        return await asyncio.to_thread(
            sql_management.run_management_sql,
            plugin,
            record,
            db_name=name,
            sql=sql,
            limit=limit,
        )

    async def sql_complete(
        self,
        plugin_id: str,
        database_name: str,
        *,
        prefix: str,
        table_name: str | None = None,
    ) -> dict[str, Any]:
        from server.db_engines import sql_management

        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        return await asyncio.to_thread(
            sql_management.sql_complete,
            plugin,
            record,
            db_name=name,
            prefix=prefix,
            table_name=table_name,
        )

    async def list_table_columns(
        self,
        plugin_id: str,
        database_name: str,
        table_name: str,
    ) -> dict[str, Any]:
        from server.db_engines import sql_management

        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        items = await asyncio.to_thread(
            sql_management.list_table_columns,
            plugin,
            record,
            db_name=name,
            table_name=table_name,
        )
        return {"plugin_id": plugin_id, "database": name, "table": table_name, "items": items}

    async def create_database_table(
        self,
        plugin_id: str,
        database_name: str,
        *,
        table_name: str,
        columns: list[dict[str, Any]],
    ) -> dict[str, Any]:
        from server.db_engines import sql_management

        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        return await asyncio.to_thread(
            sql_management.create_table,
            plugin,
            record,
            db_name=name,
            table_name=table_name,
            columns=columns,
        )

    async def add_table_column(
        self,
        plugin_id: str,
        database_name: str,
        table_name: str,
        *,
        column_name: str,
        column_type: str,
        nullable: bool = True,
        default: str | None = None,
    ) -> dict[str, Any]:
        from server.db_engines import sql_management

        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        return await asyncio.to_thread(
            sql_management.add_column,
            plugin,
            record,
            db_name=name,
            table_name=table_name,
            column_name=column_name,
            column_type=column_type,
            nullable=nullable,
            default=default,
        )

    async def insert_table_row(
        self,
        plugin_id: str,
        database_name: str,
        table_name: str,
        *,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        from server.db_engines import sql_management

        record = self._require_installed(plugin_id)
        plugin = self._require_plugin(plugin_id)
        name = catalog.validate_db_name(database_name)
        return await asyncio.to_thread(
            sql_management.insert_row,
            plugin,
            record,
            db_name=name,
            table_name=table_name,
            values=values,
        )

    async def update_connection_config(
        self, plugin_id: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        from server.app_store.manager import _port_free

        store = _store_manager()
        record = self._require_installed(plugin_id)
        mode = record.get("mode")
        if mode == "source":
            raise HTTPException(status_code=400, detail="source plugins have no connection config")

        plugin = self._require_plugin(plugin_id)
        current = dict(record.get("config") or {})
        old_port = int(current.get("port") or plugin.default_port)

        if patch.get("regenerate_password"):
            patch = {**patch, "password": _generate_password() if plugin.id != "memcached" else ""}

        for key in ("host", "port", "username", "password", "database", "management_port"):
            if key not in patch:
                continue
            value = patch[key]
            if value is None:
                continue
            if key == "password" and value == "":
                continue
            current[key] = value

        current = catalog.sync_managed_catalog_row(current)
        new_port = int(current.get("port") or plugin.default_port)
        if new_port != old_port and not _port_free(new_port):
            raise HTTPException(status_code=409, detail=f"port {new_port} is already in use")

        if mode == "native" and new_port != old_port:
            raise HTTPException(
                status_code=400,
                detail="native port changes require uninstall and reinstall",
            )

        if mode == "docker":
            redeploy = (
                new_port != old_port or "password" in patch or patch.get("regenerate_password")
            )
            if redeploy:
                pdir = state.plugin_dir(plugin_id)
                await asyncio.to_thread(docker.compose_down, pdir, volumes=False)
                image = str(current.get("docker_image") or plugin.docker_image)
                password = str(current.get("password") or "")
                await asyncio.to_thread(
                    store._write_compose_and_up,
                    plugin,
                    new_port,
                    password,
                    image,
                )

        probe = probes.probe_plugin(plugin, current)
        if not probe.get("ok"):
            raise HTTPException(status_code=400, detail=probe.get("message") or "connection failed")

        status = record.get("status") or "installed"
        if mode == "docker":
            container = str(current.get("container_name") or plugin.container_name)
            running = docker.container_running(container)
            if not running:
                status = "stopped"
            elif probe.get("ok"):
                status = "running"
            else:
                status = "error"
        elif mode == "native":
            running = driver_install.native_service_running(plugin_id)
            if not running:
                status = "stopped"
            elif probe.get("ok"):
                status = "running"
            else:
                status = "error"
        elif mode == "external":
            status = "external" if probe.get("ok") else "error"

        record = state.touch_record(
            record,
            config=current,
            status=status,
            probe=probe,
            error=None if probe.get("ok") else probe.get("message"),
        )
        state.save_installed(plugin_id, record)
        return store._public_installed(plugin_id, record)


def get_database_engine_service() -> DatabaseEngineService:
    global _service
    if _service is None:
        _service = DatabaseEngineService()
    return _service


def list_database_providers() -> list[dict[str, Any]]:
    from deploy.drivers.version_probe import (
        build_install_options,
        probe_host_installed_version,
    )
    from server.app_store import get_store_manager

    env = get_store_manager().get_environment()
    items = registry.list_provider_catalog()
    for row in items:
        pid = str(row.get("id") or "")
        spec_versions: list[str] = []
        try:
            opts = build_install_options(pid, env)
            spec_versions = [v["id"] for v in opts.get("docker_versions") or []]
            if not spec_versions:
                spec_versions = [v["id"] for v in opts.get("native_versions") or []]
            row["default_version"] = opts.get("default_version")
            row["available_versions"] = spec_versions
            row["host_detected_version"] = opts.get("host_detected_version")
        except ValueError:
            row["host_detected_version"] = probe_host_installed_version(pid)
    return items


def get_database_install_options(plugin_id: str) -> dict[str, Any]:
    from deploy.drivers.version_probe import build_install_options
    from server.app_store import get_store_manager

    env = get_store_manager().get_environment()
    return build_install_options(plugin_id, env)
