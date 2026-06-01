"""App store orchestration — install, lifecycle, and probes."""

from __future__ import annotations

import asyncio
import secrets
import socket
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from config import get_settings
from core.plugins import (
    get_installed_spec,
    get_plugin_manager,
    get_source_spec,
    list_source_catalog,
)
from deploy.drivers import install as driver_install
from deploy.drivers.registry import docker_image_for, get_driver_spec
from server.app_store import catalog, docker, probes, state
from server.app_store.catalog import StorePluginDefinition, get_plugin, list_catalog
from server.module_profiles import enrich_catalog_row


def _port_free(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return False
    except OSError:
        return True


def _generate_password() -> str:
    return secrets.token_urlsafe(18)


def _seed_default_database(config: dict[str, Any]) -> dict[str, Any]:
    if isinstance(config.get("databases"), list) and config["databases"]:
        return config
    name = str(config.get("database") or "panel")
    config["databases"] = [
        {
            "name": name,
            "username": config.get("username"),
            "password": config.get("password"),
            "charset": "utf8mb4",
            "created_at": datetime.now(UTC).isoformat(),
        }
    ]
    return config


class StoreManager:
    def get_environment(self) -> dict[str, Any]:
        info = docker.environment_info()
        info.update(driver_install.environment_info())
        info["store_dir"] = str(state.store_root())
        info["installed_plugins_dir"] = str(state.installed_root())
        info["builtin_sqlite"] = {
            "label": "Panel SQLite",
            "path": str(get_settings().db_path),
            "description": "Built-in product catalog database (always available).",
        }
        return info

    def list_catalog(self) -> list[dict[str, Any]]:
        installed = state.list_installed()
        items: list[dict[str, Any]] = []
        for entry in list_catalog():
            pid = entry["id"]
            inst = installed.get(pid)
            row = {
                **entry,
                "installed": inst is not None,
                "status": inst.get("status") if inst else "not_installed",
                "mode": inst.get("mode") if inst else None,
            }
            items.append(enrich_catalog_row(row, expected_kind="store_service"))
        for entry in list_source_catalog(installed_ids=set(installed.keys())):
            pid = entry["id"]
            inst = installed.get(pid)
            row = {**entry, "installed": inst is not None}
            if inst:
                row["status"] = inst.get("status") or row.get("status")
                row["mode"] = inst.get("mode")
            items.append(enrich_catalog_row(row, expected_kind="source_plugin"))
        return items

    def list_installed(self) -> list[dict[str, Any]]:
        return [self._public_installed(pid, entry) for pid, entry in state.list_installed().items()]

    def get_plugin_detail(self, plugin_id: str) -> dict[str, Any]:
        catalog_row = get_plugin_manager().get_catalog_item(
            plugin_id,
            installed_ids=set(state.list_installed().keys()),
        )
        if catalog_row and catalog_row.get("kind") in ("site", "source"):
            inst = state.get_installed(plugin_id)
            if inst:
                installation = self._public_installed(plugin_id, inst)
                catalog_row = {**catalog_row, "installation": installation}
            return enrich_catalog_row(catalog_row, expected_kind="source_plugin")

        installed_spec = get_installed_spec(plugin_id)
        if installed_spec:
            inst = state.get_installed(plugin_id)
            row = installed_spec.manifest.to_catalog_dict(
                installed=inst is not None,
                status=str(inst.get("status")) if inst else "not_installed",
            )
            row["domains"] = list(installed_spec.manifest.domains)
            if inst:
                row["installation"] = self._public_installed(plugin_id, inst)
            return enrich_catalog_row(row)

        source = get_source_spec(plugin_id)
        if source:
            installed = state.list_installed()
            catalog_rows = list_source_catalog(installed_ids=set(installed.keys()))
            catalog_item = next((r for r in catalog_rows if r["id"] == plugin_id), None)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="unknown plugin")
            inst = state.get_installed(plugin_id)
            catalog_item["installed"] = inst is not None
            if inst:
                catalog_item["installation"] = self._public_installed(plugin_id, inst)
            return enrich_catalog_row(catalog_item, expected_kind="source_plugin")

        plugin = self._require_plugin(plugin_id)
        inst = state.get_installed(plugin_id)
        catalog_item = plugin.to_catalog_dict()
        catalog_item["installed"] = inst is not None
        if inst:
            catalog_item["installation"] = self._public_installed(plugin_id, inst)
        return enrich_catalog_row(catalog_item, expected_kind="store_service")

    async def enable_source(self, plugin_id: str) -> dict[str, Any]:
        spec = get_source_spec(plugin_id)
        if not spec:
            raise HTTPException(status_code=404, detail="unknown plugin")
        if not spec.is_enabled():
            raise HTTPException(
                status_code=400,
                detail="plugin disabled in config/plugins.yaml",
            )
        if state.get_installed(plugin_id):
            raise HTTPException(status_code=409, detail="plugin already enabled")

        config: dict[str, Any] = {"domains": list(spec.all_domains())}
        record = state.new_install_record(
            plugin_id,
            mode="source",
            config=config,
            status="running",
        )
        record = state.touch_record(record, probe={"ok": True, "message": "source plugin active"})
        state.save_installed(plugin_id, record)
        return self._public_installed(plugin_id, record)

    async def disable_source(self, plugin_id: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        if record.get("mode") != "source":
            raise HTTPException(status_code=400, detail="not a source plugin")
        if not state.remove_installed(plugin_id):
            raise HTTPException(status_code=404, detail="plugin not installed")
        return {"message": "source plugin disabled", "plugin_id": plugin_id}

    async def install_native(
        self,
        plugin_id: str,
        *,
        version: str | None = None,
        port: int | None = None,
    ) -> dict[str, Any]:
        """Validate, register the install record, then run the driver script in background."""
        plugin = self._require_plugin(plugin_id)
        driver = get_driver_spec(plugin_id)
        if not driver:
            raise HTTPException(
                status_code=400, detail="plugin does not support native driver install"
            )
        if state.get_installed(plugin_id):
            raise HTTPException(status_code=409, detail="plugin already installed")
        if not driver_install.environment_info().get("native_driver_available"):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Native driver install is not available on this platform. "
                    "Use Docker install or connect an external instance."
                ),
            )

        resolved = driver.resolve_version(version)
        bind_port = port or plugin.default_port
        if not _port_free(bind_port):
            raise HTTPException(status_code=409, detail=f"port {bind_port} is already in use")

        password = _generate_password() if plugin.id != "memcached" else ""
        config: dict[str, Any] = {
            "host": "127.0.0.1",
            "port": bind_port,
            "password": password or None,
            "username": (
                "panel" if plugin.id in {"postgresql", "mysql", "mongodb", "rabbitmq"} else None
            ),
            "database": "panel" if plugin.id in {"postgresql", "mysql", "mongodb"} else None,
            "driver_version": resolved.id,
        }
        if plugin.id == "rabbitmq":
            config["management_port"] = bind_port + 10000 if bind_port < 20000 else 15672

        record = state.new_install_record(
            plugin_id, mode="native", config=config, status="installing"
        )
        state.save_installed(plugin_id, record)

        # Return immediately; the driver script runs in the background.
        asyncio.ensure_future(
            self._bg_native_install(
                plugin, plugin_id, config, record, password, resolved, bind_port
            )
        )
        return self._public_installed(plugin_id, record)

    async def _bg_native_install(
        self,
        plugin: Any,
        plugin_id: str,
        config: dict[str, Any],
        record: dict[str, Any],
        password: str,
        resolved: Any,
        bind_port: int,
    ) -> None:
        """Background task: run native driver script and update install record."""
        pdir = state.plugin_dir(plugin_id)
        try:
            result = await asyncio.to_thread(
                driver_install.run_native_install,
                plugin_id,
                version=resolved.id,
                port=bind_port,
                password=password,
                workspace=pdir,
            )
            if not result.get("ok"):
                raise RuntimeError(result.get("message") or "native install failed")
            probe = probes.probe_plugin(plugin, config)
            running = driver_install.native_service_running(plugin_id)
            status = "running" if probe.get("ok") and running else "installed"
            record["config"] = _seed_default_database(dict(record.get("config") or {}))
            record = state.touch_record(
                record,
                status=status,
                probe=probe,
                error=None if probe.get("ok") else probe.get("message"),
            )
        except Exception as exc:
            record = state.touch_record(record, status="error", error=str(exc))
        finally:
            state.save_installed(plugin_id, record)

    async def install_docker(
        self,
        plugin_id: str,
        *,
        port: int | None = None,
        version: str | None = None,
    ) -> dict[str, Any]:
        """Validate, register the install record, then bring up the container in background."""
        plugin = self._require_plugin(plugin_id)
        if not plugin.supports_docker:
            raise HTTPException(status_code=400, detail="plugin does not support docker install")
        if state.get_installed(plugin_id):
            raise HTTPException(status_code=409, detail="plugin already installed")
        if not docker.docker_cli_available() or not docker.compose_cli_available():
            raise HTTPException(
                status_code=503,
                detail="Docker and Docker Compose are required for one-click install",
            )

        bind_port = port or plugin.default_port
        if not _port_free(bind_port):
            raise HTTPException(status_code=409, detail=f"port {bind_port} is already in use")

        password = _generate_password() if plugin.id != "memcached" else ""
        image = docker_image_for(plugin_id, version) or plugin.docker_image
        driver = get_driver_spec(plugin_id)
        driver_version = driver.resolve_version(version).id if driver else plugin.version
        config: dict[str, Any] = {
            "host": "127.0.0.1",
            "port": bind_port,
            "password": password or None,
            "username": (
                "panel" if plugin.id in {"postgresql", "mysql", "mongodb", "rabbitmq"} else None
            ),
            "database": "panel" if plugin.id in {"postgresql", "mysql", "mongodb"} else None,
            "container_name": plugin.container_name,
            "docker_image": image,
            "driver_version": driver_version,
        }
        if plugin.id == "rabbitmq":
            config["management_port"] = bind_port + 10000 if bind_port < 20000 else 15672

        record = state.new_install_record(
            plugin_id, mode="docker", config=config, status="installing"
        )
        state.save_installed(plugin_id, record)

        # Return immediately; docker compose up runs in the background.
        asyncio.ensure_future(
            self._bg_docker_install(plugin, plugin_id, config, record, bind_port, password, image)
        )
        return self._public_installed(plugin_id, record)

    async def _bg_docker_install(
        self,
        plugin: Any,
        plugin_id: str,
        config: dict[str, Any],
        record: dict[str, Any],
        bind_port: int,
        password: str,
        image: str,
    ) -> None:
        """Background task: run docker compose up and update install record."""
        try:
            await asyncio.to_thread(
                self._write_compose_and_up,
                plugin,
                bind_port,
                password,
                image,
            )
            probe = probes.probe_plugin(plugin, config)
            running = docker.container_running(plugin.container_name)
            status = "running" if probe.get("ok") and running else "installed"
            record["config"] = _seed_default_database(dict(record.get("config") or {}))
            record = state.touch_record(
                record,
                status=status,
                probe=probe,
                error=None if probe.get("ok") else probe.get("message"),
            )
        except Exception as exc:
            record = state.touch_record(record, status="error", error=str(exc))
        finally:
            state.save_installed(plugin_id, record)

    async def connect_external(self, plugin_id: str, config: dict[str, Any]) -> dict[str, Any]:
        plugin = self._require_plugin(plugin_id)
        if not plugin.supports_external:
            raise HTTPException(
                status_code=400, detail="plugin does not support external connection"
            )
        existing = state.get_installed(plugin_id)
        if existing and existing.get("mode") in {"docker", "native"}:
            raise HTTPException(
                status_code=409,
                detail="uninstall the managed instance before switching to external connection",
            )

        host = str(config.get("host") or "127.0.0.1").strip()
        port = int(config.get("port") or plugin.default_port)
        merged: dict[str, Any] = {
            "host": host,
            "port": port,
            "username": config.get("username"),
            "password": config.get("password"),
            "database": config.get("database"),
            "management_port": config.get("management_port"),
        }
        if existing and existing.get("mode") == "external":
            prior = dict(existing.get("config") or {})
            if merged.get("password") in (None, "") and prior.get("password"):
                merged["password"] = prior["password"]
            for key, value in prior.items():
                if key not in merged or merged[key] is None:
                    merged[key] = value
            return await self.update_config(plugin_id, merged)

        probe = probes.probe_plugin(plugin, merged)
        if not probe.get("ok"):
            raise HTTPException(status_code=400, detail=probe.get("message") or "connection failed")

        record = state.new_install_record(
            plugin_id,
            mode="external",
            config=merged,
            status="external",
        )
        record = state.touch_record(record, probe=probe)
        record["config"] = _seed_default_database(dict(record.get("config") or {}))
        state.save_installed(plugin_id, record)
        return self._public_installed(plugin_id, record)

    def get_credentials(self, plugin_id: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        config = dict(record.get("config") or {})
        return {
            "plugin_id": plugin_id,
            "mode": record.get("mode"),
            "host": config.get("host"),
            "port": config.get("port"),
            "username": config.get("username"),
            "database": config.get("database"),
            "password": config.get("password"),
            "management_port": config.get("management_port"),
            "has_password": bool(config.get("password")),
        }

    async def update_config(self, plugin_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        from server.services.database_engine import get_database_engine_service

        return await get_database_engine_service().update_connection_config(plugin_id, patch)

    async def start(self, plugin_id: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        mode = record.get("mode")
        if mode == "docker":
            plugin = self._require_plugin(plugin_id)
            pdir = state.plugin_dir(plugin_id)
            ok, msg = await asyncio.to_thread(docker.compose_start, pdir)
            if not ok:
                raise HTTPException(status_code=500, detail=msg)
            probe = probes.probe_plugin(plugin, record["config"])
            status = "running" if probe.get("ok") else "installed"
            record = state.touch_record(record, status=status, probe=probe, error=None)
            state.save_installed(plugin_id, record)
            return self._public_installed(plugin_id, record)
        if mode == "native":
            result = await asyncio.to_thread(driver_install.run_native_service, plugin_id, "start")
            if not result.get("ok"):
                raise HTTPException(status_code=500, detail=result.get("message"))
            plugin = self._require_plugin(plugin_id)
            probe = probes.probe_plugin(plugin, record["config"])
            status = "running" if probe.get("ok") else "installed"
            record = state.touch_record(record, status=status, probe=probe, error=None)
            state.save_installed(plugin_id, record)
            return self._public_installed(plugin_id, record)
        raise HTTPException(status_code=400, detail="only docker or native plugins can be started")

    async def stop(self, plugin_id: str) -> dict[str, Any]:
        record = self._require_installed(plugin_id)
        mode = record.get("mode")
        if mode == "docker":
            pdir = state.plugin_dir(plugin_id)
            ok, msg = await asyncio.to_thread(docker.compose_stop, pdir)
            if not ok:
                raise HTTPException(status_code=500, detail=msg)
            record = state.touch_record(
                record, status="stopped", probe={"ok": False, "message": "stopped"}
            )
            state.save_installed(plugin_id, record)
            return self._public_installed(plugin_id, record)
        if mode == "native":
            result = await asyncio.to_thread(driver_install.run_native_service, plugin_id, "stop")
            if not result.get("ok"):
                raise HTTPException(status_code=500, detail=result.get("message"))
            record = state.touch_record(
                record, status="stopped", probe={"ok": False, "message": "stopped"}
            )
            state.save_installed(plugin_id, record)
            return self._public_installed(plugin_id, record)
        raise HTTPException(status_code=400, detail="only docker or native plugins can be stopped")

    async def restart(self, plugin_id: str) -> dict[str, Any]:
        await self.stop(plugin_id)
        return await self.start(plugin_id)

    async def uninstall(self, plugin_id: str) -> dict[str, Any]:
        record = state.get_installed(plugin_id)
        if not record:
            raise HTTPException(status_code=404, detail="plugin not installed")
        mode = record.get("mode")
        if mode == "docker":
            pdir = state.plugin_dir(plugin_id)
            await asyncio.to_thread(docker.compose_down, pdir, volumes=True)
        elif mode == "native":
            pdir = state.plugin_dir(plugin_id)
            await asyncio.to_thread(driver_install.run_native_uninstall, plugin_id, workspace=pdir)
        state.remove_installed(plugin_id)
        return {"plugin_id": plugin_id, "removed": True}

    async def refresh_status(self, plugin_id: str) -> dict[str, Any]:
        record = state.get_installed(plugin_id)
        if not record:
            # Return a not_installed stub for known catalog/source plugins so the
            # settings drawer can open without 404 noise when the plugin is not yet installed.
            plugin = get_plugin(plugin_id)
            source = get_source_spec(plugin_id)
            if plugin:
                return {
                    "plugin_id": plugin_id,
                    "name": plugin.name,
                    "category": plugin.category,
                    "mode": None,
                    "status": "not_installed",
                    "config": {},
                    "probe": None,
                    "error": None,
                }
            if source:
                return {
                    "plugin_id": plugin_id,
                    "name": source.manifest.name,
                    "category": source.manifest.category,
                    "mode": None,
                    "status": "not_installed",
                    "config": {},
                    "probe": None,
                    "error": None,
                }
            raise HTTPException(status_code=404, detail="plugin not installed")
        if record.get("mode") == "source":
            spec = get_source_spec(plugin_id)
            ok = bool(spec and spec.is_enabled())
            probe = {"ok": ok, "message": "source plugin active" if ok else "disabled in config"}
            record = state.touch_record(
                record,
                status="running" if ok else "disabled",
                probe=probe,
                error=None if ok else probe.get("message"),
            )
            state.save_installed(plugin_id, record)
            return self._public_installed(plugin_id, record)

        plugin = self._require_plugin(plugin_id)
        config = record.get("config") or {}
        probe = probes.probe_plugin(plugin, config)

        status = record.get("status") or "installed"
        if record.get("mode") == "docker":
            container = str(config.get("container_name") or plugin.container_name)
            running = docker.container_running(container)
            if not running:
                status = "stopped"
            elif probe.get("ok"):
                status = "running"
            else:
                status = "error"
        elif record.get("mode") == "native":
            running = driver_install.native_service_running(plugin_id)
            if not running:
                status = "stopped"
            elif probe.get("ok"):
                status = "running"
            else:
                status = "error"
        elif record.get("mode") == "external":
            status = "external" if probe.get("ok") else "error"

        record = state.touch_record(
            record,
            status=status,
            probe=probe,
            error=None if probe.get("ok") else probe.get("message"),
        )
        state.save_installed(plugin_id, record)
        return self._public_installed(plugin_id, record)

    def _write_compose_and_up(
        self,
        plugin: StorePluginDefinition,
        port: int,
        password: str,
        docker_image: str,
    ) -> None:
        pdir = state.plugin_dir(plugin.id)
        compose = catalog.render_compose(
            plugin,
            port=port,
            password=password,
            docker_image=docker_image,
        )
        (pdir / "docker-compose.yml").write_text(compose, encoding="utf-8")
        env_lines = [f"PORT={port}"]
        if password:
            env_lines.append(f"PASSWORD={password}")
        (pdir / ".env").write_text("\n".join(env_lines) + "\n", encoding="utf-8")
        ok, msg = docker.compose_up(pdir)
        if not ok:
            raise RuntimeError(msg)

    def _public_installed(self, plugin_id: str, entry: dict[str, Any]) -> dict[str, Any]:
        plugin = get_plugin(plugin_id)
        source = get_source_spec(plugin_id)
        config = dict(entry.get("config") or {})
        safe_config = {**config}
        if safe_config.get("password"):
            safe_config["password_set"] = True
            safe_config.pop("password", None)
        name = plugin.name if plugin else source.manifest.name if source else plugin_id
        category = plugin.category if plugin else source.manifest.category if source else "database"
        return {
            "plugin_id": plugin_id,
            "name": name,
            "category": category,
            "mode": entry.get("mode"),
            "status": entry.get("status"),
            "installed_at": entry.get("installed_at"),
            "updated_at": entry.get("updated_at"),
            "config": safe_config,
            "probe": entry.get("probe"),
            "error": entry.get("error"),
            "container_name": entry.get("container_name") or config.get("container_name"),
        }

    def get_install_log(self, plugin_id: str) -> dict[str, Any]:
        """Return accumulated install log lines for a plugin."""
        record = state.get_installed(plugin_id)
        status = record.get("status", "not_installed") if record else "not_installed"
        mode = record.get("mode") if record else None

        lines: list[str] = []

        if mode == "native":
            log_path = state.plugin_dir(plugin_id) / "install.log"
            if log_path.is_file():
                try:
                    raw = log_path.read_text(encoding="utf-8", errors="replace")
                    lines = raw.splitlines()
                except OSError:
                    lines = ["(log file not readable)"]
            elif status == "installing":
                lines = ["Install script starting — log will appear here shortly…"]

        elif mode == "docker":
            pdir = state.plugin_dir(plugin_id)
            compose_file = pdir / "docker-compose.yml"
            if compose_file.is_file():
                try:
                    result = docker.compose_logs(pdir, tail=200)
                    lines = result.splitlines() if result else []
                except Exception as exc:
                    lines = [f"(docker logs unavailable: {exc})"]

        if not lines and record:
            error = record.get("error")
            probe_msg = (record.get("probe") or {}).get("message")
            if error:
                lines = [f"Error: {error}"]
            elif probe_msg:
                lines = [probe_msg]

        return {
            "plugin_id": plugin_id,
            "status": status,
            "mode": mode,
            "lines": lines,
            "tail": len(lines),
        }

    def _require_plugin(self, plugin_id: str) -> StorePluginDefinition:
        if get_source_spec(plugin_id):
            raise HTTPException(
                status_code=400,
                detail="source plugins use enable/disable, not docker lifecycle",
            )
        plugin = get_plugin(plugin_id)
        if not plugin:
            raise HTTPException(status_code=404, detail="unknown plugin")
        return plugin

    def _require_installed(self, plugin_id: str) -> dict[str, Any]:
        entry = state.get_installed(plugin_id)
        if not entry:
            raise HTTPException(status_code=404, detail="plugin not installed")
        return entry


_manager: StoreManager | None = None


def get_store_manager() -> StoreManager:
    global _manager
    if _manager is None:
        _manager = StoreManager()
    return _manager
