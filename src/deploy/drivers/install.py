"""Native driver install/uninstall for App Store infrastructure services."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from deploy.drivers.executor import (
    detect_executor_platform,
    native_driver_supported,
    run_driver_script,
    service_active,
    systemd_action,
)
from deploy.drivers.registry import get_driver_spec


def environment_info() -> dict[str, Any]:
    platform = detect_executor_platform()
    return {
        "native_driver_available": native_driver_supported(),
        "platform": platform,
    }


def run_native_install(
    plugin_id: str,
    *,
    version: str,
    port: int,
    password: str,
    workspace: Path,
) -> dict[str, Any]:
    spec = get_driver_spec(plugin_id)
    if not spec:
        return {"ok": False, "message": f"no native driver for {plugin_id}"}
    if not native_driver_supported():
        return {
            "ok": False,
            "message": (
                "Native driver install is not available on this platform. "
                "Use Docker install or connect an external instance."
            ),
        }

    workspace.mkdir(parents=True, exist_ok=True)
    log_path = workspace / "install.log"

    env = {
        "PLUGIN_ID": plugin_id,
        "VERSION": version,
        "PORT": str(port),
        "PASSWORD": password,
        "USERNAME": "panel",
        "DATABASE": "panel",
        "CONFIG_DIR": str(workspace),
    }
    # Pass log_path so the script output is streamed to the file in real time,
    # enabling the panel to tail it while the install is still running.
    result = run_driver_script(plugin_id, "install", env=env, log_path=log_path)

    if not result.get("ok"):
        return result

    meta = {
        "plugin_id": plugin_id,
        "version": version,
        "port": port,
        "systemd_unit": spec.systemd_unit,
        "platform": detect_executor_platform(),
    }
    (workspace / "driver.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return result


def run_native_uninstall(plugin_id: str, *, workspace: Path) -> dict[str, Any]:
    spec = get_driver_spec(plugin_id)
    if not spec:
        return {"ok": True, "message": "no native driver spec"}

    meta_path = workspace / "driver.json"
    version = spec.default_version
    if meta_path.is_file():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            version = str(meta.get("version") or version)
        except (json.JSONDecodeError, OSError):
            pass

    env = {
        "PLUGIN_ID": plugin_id,
        "VERSION": version,
        "CONFIG_DIR": str(workspace),
    }
    result = run_driver_script(plugin_id, "uninstall", env=env)
    for name in ("driver.json", "install.log"):
        path = workspace / name
        if path.is_file():
            path.unlink(missing_ok=True)
    return result


def run_native_service(plugin_id: str, action: str) -> dict[str, Any]:
    spec = get_driver_spec(plugin_id)
    if not spec:
        return {"ok": False, "message": f"no native driver for {plugin_id}"}
    return systemd_action(spec.systemd_unit, action)


def native_service_running(plugin_id: str) -> bool:
    spec = get_driver_spec(plugin_id)
    if not spec:
        return False
    return service_active(spec.systemd_unit)
