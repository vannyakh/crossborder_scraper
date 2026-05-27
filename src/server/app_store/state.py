"""Persist installed plugins under ``installed_plugins/`` at repo root."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from config import get_settings
from core.plugins import get_plugin_manager
from server.app_store.catalog import InstallMode, StorePluginStatus


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def store_root() -> Path:
    """Panel store metadata (environment paths, legacy)."""
    root = get_settings().data_dir / "store"
    root.mkdir(parents=True, exist_ok=True)
    return root


def installed_root() -> Path:
    return get_plugin_manager().ensure_layout()


def state_path() -> Path:
    return get_plugin_manager().installed_state_path()


def plugin_dir(plugin_id: str) -> Path:
    return get_plugin_manager().workspace(plugin_id)


def _read_state() -> dict[str, Any]:
    path = state_path()
    if not path.exists():
        return {"plugins": {}}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"plugins": {}}
    if not isinstance(raw, dict):
        return {"plugins": {}}
    plugins = raw.get("plugins")
    if not isinstance(plugins, dict):
        raw["plugins"] = {}
    return raw


def _write_state(data: dict[str, Any]) -> None:
    path = state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def ensure_store_state() -> Path:
    installed_root()
    if not state_path().exists():
        _write_state({"plugins": {}})
    return state_path()


def list_installed() -> dict[str, dict[str, Any]]:
    return dict(_read_state().get("plugins") or {})


def get_installed(plugin_id: str) -> dict[str, Any] | None:
    entry = list_installed().get(plugin_id)
    return dict(entry) if isinstance(entry, dict) else None


def save_installed(plugin_id: str, entry: dict[str, Any]) -> dict[str, Any]:
    data = _read_state()
    plugins = data.setdefault("plugins", {})
    plugins[plugin_id] = entry
    _write_state(data)
    return entry


def remove_installed(plugin_id: str) -> bool:
    data = _read_state()
    plugins = data.get("plugins") or {}
    if plugin_id not in plugins:
        return False
    del plugins[plugin_id]
    _write_state(data)
    return True


def new_install_record(
    plugin_id: str,
    *,
    mode: InstallMode,
    config: dict[str, Any],
    status: StorePluginStatus = "installing",
) -> dict[str, Any]:
    return {
        "plugin_id": plugin_id,
        "mode": mode,
        "status": status,
        "installed_at": _now_iso(),
        "updated_at": _now_iso(),
        "config": config,
        "container_name": config.get("container_name"),
        "error": None,
        "probe": None,
    }


def touch_record(entry: dict[str, Any], **updates: Any) -> dict[str, Any]:
    entry = {**entry, **updates, "updated_at": _now_iso()}
    return entry
