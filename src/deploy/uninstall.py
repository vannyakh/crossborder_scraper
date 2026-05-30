"""Remove Cross-Border panel service registration and optional install files."""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from config import get_settings
from core.paths import repo_root
from deploy.autostart import autostart


@dataclass
class UninstallResult:
    steps: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _panel_pid_on_port(port: int) -> int | None:
    if sys.platform == "win32":
        return None
    try:
        out = subprocess.run(
            ["lsof", "-t", f"-i:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            check=False,
        )
        line = (out.stdout or "").strip().splitlines()
        if line:
            return int(line[0])
    except (FileNotFoundError, ValueError, OSError):
        pass
    return None


def _stop_panel(port: int) -> str | None:
    pid = _panel_pid_on_port(port)
    if not pid:
        return None
    os.kill(pid, signal.SIGTERM)
    return str(pid)


def _remove_systemd_unit() -> tuple[bool, str]:
    unit = Path("/etc/systemd/system/crossborder-scraper.service")
    if not unit.is_file():
        return False, "systemd unit not present"
    try:
        subprocess.run(["systemctl", "stop", "crossborder-scraper"], check=False)
        subprocess.run(["systemctl", "disable", "crossborder-scraper"], check=False)
        unit.unlink()
        subprocess.run(["systemctl", "daemon-reload"], check=False)
        return True, f"removed {unit}"
    except OSError as exc:
        return False, str(exc)


def run_uninstall(
    *,
    stop_service: bool = True,
    disable_autostart: bool = True,
    remove_systemd: bool = False,
    purge: bool = False,
) -> UninstallResult:
    """Stop panel, disable boot auto-start, optionally remove systemd unit and install dir."""
    result = UninstallResult()
    settings = get_settings()
    port = settings.panel_port
    root = repo_root()

    if stop_service:
        pid = _stop_panel(port)
        if pid:
            result.steps.append(f"Stopped panel process (PID {pid}) on port {port}")
        else:
            result.steps.append(f"No panel process listening on port {port}")

    if disable_autostart:
        auto = autostart("disable", port=port)
        if auto.ok:
            result.steps.append(f"Auto-start disabled ({auto.platform}/{auto.method})")
        else:
            result.warnings.append(f"Auto-start: {auto.message}")

    if remove_systemd:
        if sys.platform.startswith("linux"):
            ok, msg = _remove_systemd_unit()
            if ok:
                result.steps.append(msg)
            else:
                result.warnings.append(f"systemd: {msg}")
        else:
            result.warnings.append("systemd removal only applies on Linux")

    if purge:
        if root == Path.home() or root == Path("/"):
            result.warnings.append(f"Refusing to delete unsafe path: {root}")
        else:
            shutil.rmtree(root)
            result.steps.append(f"Removed install directory: {root}")

    return result
