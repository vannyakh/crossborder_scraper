"""Install and remove third-party plugins into ``installed_plugins/``."""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from typing import Any

from core.plugins.manager import get_plugin_manager
from core.plugins.security import (
    InstalledPluginManifest,
    PluginSecurityError,
    SecurityPolicy,
    extract_zip_safely,
    load_manifest_file,
    validate_plugin_workspace,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class PluginInstaller:
    def __init__(self, policy: SecurityPolicy | None = None) -> None:
        self.mgr = get_plugin_manager()
        self.policy = policy or self.mgr.security_policy

    def install_zip(self, data: bytes, *, replace: bool = False) -> dict[str, Any]:
        staging = self.mgr.installed_root / ".staging"
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        staging.mkdir(parents=True)

        try:
            extract_zip_safely(data, staging, policy=self.policy)
            manifest = validate_plugin_workspace(staging, policy=self.policy)

            if manifest.id in self.policy.trusted_builtin_ids:
                raise PluginSecurityError(
                    f"plugin id '{manifest.id}' is reserved for built-in plugins",
                )

            target = self.mgr.workspace(manifest.id)
            if target.exists() and any(target.iterdir()) and not replace:
                raise PluginSecurityError(
                    f"plugin '{manifest.id}' already installed; pass replace=true to overwrite",
                )

            if target.exists():
                shutil.rmtree(target)

            shutil.move(str(staging), str(target))
            staging = None  # moved

            record = {
                "plugin_id": manifest.id,
                "mode": "source",
                "status": "installed",
                "trusted": False,
                "sandboxed": True,
                "installed_at": _now_iso(),
                "updated_at": _now_iso(),
                "manifest": {
                    "id": manifest.id,
                    "name": manifest.name,
                    "version": manifest.version,
                    "domains": list(manifest.domains),
                    "permissions": manifest.permissions.to_dict(),
                },
                "config": {"domains": list(manifest.domains)},
                "probe": {"ok": True, "message": "validated and installed"},
            }
            self._save_installed_record(manifest.id, record)
            get_plugin_manager().reload()

            return {
                "ok": True,
                "plugin_id": manifest.id,
                "version": manifest.version,
                "sandboxed": True,
                "workspace": str(target),
                "permissions": manifest.permissions.to_dict(),
            }
        finally:
            if staging and staging.exists():
                shutil.rmtree(staging, ignore_errors=True)

    def uninstall(self, plugin_id: str) -> dict[str, Any]:
        plugin_id = plugin_id.strip().lower()
        if plugin_id in self.policy.trusted_builtin_ids:
            raise PluginSecurityError("cannot uninstall built-in plugin via sandbox API")

        workspace = self.mgr.workspace(plugin_id)
        if workspace.exists():
            shutil.rmtree(workspace, ignore_errors=True)

        state = self.mgr.load_installed_state()
        plugins = state.get("plugins") or {}
        if plugin_id in plugins:
            del plugins[plugin_id]
            self.mgr.write_installed_state(state)

        get_plugin_manager().reload()
        return {"ok": True, "plugin_id": plugin_id, "removed": True}

    def get_installed_manifest(self, plugin_id: str) -> InstalledPluginManifest | None:
        workspace = self.mgr.workspace(plugin_id)
        manifest_path = workspace / "manifest.json"
        if not manifest_path.is_file():
            return None
        return load_manifest_file(manifest_path)

    def _save_installed_record(self, plugin_id: str, record: dict[str, Any]) -> None:
        state = self.mgr.load_installed_state()
        plugins = state.setdefault("plugins", {})
        plugins[plugin_id] = record
        self.mgr.write_installed_state(state)


def get_plugin_installer() -> PluginInstaller:
    return PluginInstaller()
