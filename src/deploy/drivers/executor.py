"""Run platform-specific store driver scripts from ``libs/store_drivers/``."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from core.paths import repo_root
from deploy.platform import detect_platform


def store_drivers_root() -> Path:
    return repo_root() / "libs" / "store_drivers"


def detect_executor_platform() -> str:
    """Platform key used to pick install/uninstall scripts."""
    plat = detect_platform()
    if plat.is_linux:
        if shutil.which("apt-get"):
            return "linux-debian"
        if shutil.which("dnf") or shutil.which("yum"):
            return "linux-rhel"
        return "linux"
    if plat.is_macos:
        return "darwin"
    if plat.is_windows:
        return "windows"
    return "unknown"


def native_driver_supported() -> bool:
    key = detect_executor_platform()
    return key in {"linux-debian", "linux-rhel", "linux"}


def resolve_script(plugin_id: str, action: str) -> Path | None:
    """Resolve ``install-debian.sh`` with fallbacks."""
    base = store_drivers_root() / plugin_id
    platform = detect_executor_platform()
    candidates = [
        base / f"{action}-{platform}.sh",
        base / f"{action}-linux-debian.sh",
        base / f"{action}-linux.sh",
        base / f"{action}.sh",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def run_driver_script(
    plugin_id: str,
    action: str,
    *,
    env: dict[str, str],
    timeout: int = 900,
) -> dict[str, Any]:
    script = resolve_script(plugin_id, action)
    if not script:
        platform = detect_executor_platform()
        return {
            "ok": False,
            "message": (
                f"No {action} script for {plugin_id} on {platform}. "
                "Use Docker install or connect an external instance."
            ),
        }

    merged = {**os.environ, **env}
    proc = _run_privileged(["bash", str(script)], env=merged, timeout=timeout)
    out = (proc.stdout or proc.stderr or "").strip()
    lines = [line for line in out.splitlines() if line.strip()]
    ok = proc.returncode == 0
    return {
        "ok": ok,
        "message": lines[-1] if lines else (f"{action} {'ok' if ok else 'failed'}"),
        "log": out,
        "script": str(script),
        "returncode": proc.returncode,
    }


def systemd_action(unit: str, action: str, *, timeout: int = 120) -> dict[str, Any]:
    if action not in {"start", "stop", "restart", "enable", "disable"}:
        return {"ok": False, "message": f"unknown systemd action: {action}"}
    if not shutil.which("systemctl"):
        return {"ok": False, "message": "systemctl not available on this host"}
    proc = _run_privileged(["systemctl", action, unit], timeout=timeout)
    ok = proc.returncode == 0
    detail = (proc.stdout or proc.stderr or "").strip()
    return {
        "ok": ok,
        "message": detail or f"{unit} {action} {'ok' if ok else 'failed'}",
    }


def service_active(unit: str) -> bool:
    if not unit or not shutil.which("systemctl"):
        return False
    proc = _run_privileged(
        ["systemctl", "is-active", unit],
        timeout=15,
    )
    return proc.returncode == 0 and (proc.stdout or "").strip() == "active"


def _run_privileged(
    argv: list[str],
    *,
    env: dict[str, str] | None = None,
    timeout: int,
) -> subprocess.CompletedProcess[str]:
    try:
        if os.geteuid() == 0:
            return subprocess.run(
                argv,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
                env=env,
            )
    except AttributeError:
        pass

    sudo = shutil.which("sudo")
    if sudo:
        return subprocess.run(
            [sudo, *argv],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env,
        )

    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env=env,
    )
