"""Cross-platform auto-start management for the Cross-Border panel.

macOS   — launchd LaunchAgent  (~/.config/crossborder/ plist → LaunchAgents)
Linux   — systemd user or system unit
Windows — Task Scheduler (schtasks) + Startup folder fallback
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from core.paths import repo_root
from deploy.network import DEFAULT_PANEL_PORT

LAUNCHD_LABEL = "com.crossborder.panel"
SYSTEMD_UNIT_NAME = "crossborder-scraper"
WINDOWS_TASK_NAME = "CrossBorder Panel"


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------


@dataclass
class AutostartResult:
    ok: bool
    platform: str
    method: str
    message: str
    detail: str = ""


# ---------------------------------------------------------------------------
# macOS — launchd LaunchAgent
# ---------------------------------------------------------------------------


def _launchd_plist_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{LAUNCHD_LABEL}.plist"


def _launchctl_load(plist_path: Path) -> tuple[bool, str]:
    """Try modern bootstrap API first, fall back to legacy load."""
    import os

    uid = os.getuid()

    # macOS 10.15+ modern API
    r = subprocess.run(
        ["launchctl", "bootstrap", f"gui/{uid}", str(plist_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode == 0:
        return True, ""

    # Legacy API fallback (macOS < 10.15 or GUI session restriction)
    r2 = subprocess.run(
        ["launchctl", "load", "-w", str(plist_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if r2.returncode == 0:
        return True, ""

    return False, (r.stderr or r2.stderr or "").strip()


def _launchctl_unload(plist_path: Path) -> None:
    import os

    uid = os.getuid()
    subprocess.run(
        ["launchctl", "bootout", f"gui/{uid}/{LAUNCHD_LABEL}"],
        capture_output=True,
        check=False,
    )
    subprocess.run(
        ["launchctl", "unload", "-w", str(plist_path)],
        capture_output=True,
        check=False,
    )


def _launchd_enable(port: int) -> AutostartResult:
    from deploy.templates import launchd_plist, write_template

    plist_path = _launchd_plist_path()
    plist_path.parent.mkdir(parents=True, exist_ok=True)
    content = launchd_plist(working_directory=str(repo_root()), port=port)
    write_template(plist_path, content)

    # Unload any existing instance first
    _launchctl_unload(plist_path)

    ok, err = _launchctl_load(plist_path)
    if not ok:
        return AutostartResult(
            ok=True,  # plist is written; loading may fail outside GUI session
            platform="macos",
            method="launchd",
            message=f"LaunchAgent written → {plist_path}",
            detail=(
                "Run this once in your terminal to activate:\n"
                f"    launchctl load -w {plist_path}"
            ),
        )
    return AutostartResult(
        ok=True,
        platform="macos",
        method="launchd",
        message=f"LaunchAgent installed and loaded → {plist_path}",
        detail="Panel will start automatically on every login.",
    )


def _launchd_disable() -> AutostartResult:
    plist_path = _launchd_plist_path()
    if not plist_path.exists():
        return AutostartResult(ok=True, platform="macos", method="launchd", message="Not installed")
    _launchctl_unload(plist_path)
    plist_path.unlink(missing_ok=True)
    return AutostartResult(
        ok=True, platform="macos", method="launchd", message="LaunchAgent removed"
    )


def _launchd_status() -> AutostartResult:
    plist_path = _launchd_plist_path()
    if not plist_path.exists():
        return AutostartResult(
            ok=False,
            platform="macos",
            method="launchd",
            message="Not installed",
            detail=f"Run: crossborder deploy autostart  (installs {plist_path})",
        )
    result = subprocess.run(
        ["launchctl", "list", LAUNCHD_LABEL],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        return AutostartResult(
            ok=True,
            platform="macos",
            method="launchd",
            message="Enabled and loaded",
            detail=plist_path.as_posix(),
        )
    return AutostartResult(
        ok=False,
        platform="macos",
        method="launchd",
        message="Plist exists but service is not loaded",
        detail=f"Run: launchctl load -w {plist_path}",
    )


# ---------------------------------------------------------------------------
# Linux — systemd
# ---------------------------------------------------------------------------


def _systemd_unit_path(system: bool = False) -> Path:
    if system:
        return Path(f"/etc/systemd/system/{SYSTEMD_UNIT_NAME}.service")
    return Path.home() / ".config" / "systemd" / "user" / f"{SYSTEMD_UNIT_NAME}.service"


def _systemd_enable(port: int, system: bool = False) -> AutostartResult:
    import os

    from deploy.templates import systemd_unit, write_template

    user = os.environ.get("USER", "nobody") if not system else "root"
    unit_path = _systemd_unit_path(system)
    content = systemd_unit(
        user=user,
        working_directory=str(repo_root()),
        port=port,
    )
    try:
        write_template(unit_path, content)
    except PermissionError:
        return AutostartResult(
            ok=False,
            platform="linux",
            method="systemd",
            message=f"Permission denied writing {unit_path}",
            detail="Run with sudo for system-wide install, or use user mode (default).",
        )

    scope = [] if system else ["--user"]
    for cmd in [
        ["systemctl"] + scope + ["daemon-reload"],
        ["systemctl"] + scope + ["enable", "--now", SYSTEMD_UNIT_NAME],
    ]:
        r = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if r.returncode != 0:
            return AutostartResult(
                ok=False,
                platform="linux",
                method="systemd",
                message=f"systemctl command failed: {' '.join(cmd)}",
                detail=r.stderr.strip(),
            )
    scope_label = "system" if system else "user"
    return AutostartResult(
        ok=True,
        platform="linux",
        method="systemd",
        message=f"systemd {scope_label} service enabled → {unit_path}",
        detail="Panel will start automatically on every boot/login.",
    )


def _systemd_disable(system: bool = False) -> AutostartResult:
    scope = [] if system else ["--user"]
    subprocess.run(
        ["systemctl"] + scope + ["disable", "--now", SYSTEMD_UNIT_NAME],
        capture_output=True,
        check=False,
    )
    unit_path = _systemd_unit_path(system)
    unit_path.unlink(missing_ok=True)
    return AutostartResult(
        ok=True, platform="linux", method="systemd", message="systemd service disabled"
    )


def _systemd_status(system: bool = False) -> AutostartResult:
    scope = [] if system else ["--user"]
    r = subprocess.run(
        ["systemctl"] + scope + ["is-enabled", SYSTEMD_UNIT_NAME],
        capture_output=True,
        text=True,
        check=False,
    )
    enabled = r.stdout.strip() == "enabled"
    return AutostartResult(
        ok=enabled,
        platform="linux",
        method="systemd",
        message="enabled" if enabled else r.stdout.strip() or "not installed",
        detail=str(_systemd_unit_path(system)),
    )


# ---------------------------------------------------------------------------
# Windows — Task Scheduler
# ---------------------------------------------------------------------------


def _windows_startup_dir() -> Path:
    import os

    return (
        Path(os.environ.get("APPDATA", ""))
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs"
        / "Startup"
    )


def _windows_task_cmd_path() -> Path:
    return repo_root() / "deploy" / "crossborder-start.cmd"


def _windows_enable(port: int) -> AutostartResult:
    from deploy.templates import windows_task_cmd, write_template

    cmd_path = _windows_task_cmd_path()
    content = windows_task_cmd(working_directory=str(repo_root()))
    write_template(cmd_path, content)

    # Try Task Scheduler first
    r = subprocess.run(
        [
            "schtasks",
            "/create",
            "/f",
            "/tn",
            WINDOWS_TASK_NAME,
            "/tr",
            f'cmd /c start "" /b "{cmd_path}"',
            "/sc",
            "ONLOGON",
            "/rl",
            "HIGHEST",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode == 0:
        return AutostartResult(
            ok=True,
            platform="windows",
            method="task_scheduler",
            message=f'Task Scheduler task "{WINDOWS_TASK_NAME}" created',
            detail="Panel will start automatically on every login.",
        )

    # Fallback: Startup folder shortcut (.cmd file)
    startup = _windows_startup_dir()
    startup_cmd = startup / "crossborder-panel.cmd"
    try:
        startup.mkdir(parents=True, exist_ok=True)
        startup_cmd.write_text(f'@start "" /b "{cmd_path}"\r\n', encoding="ascii")
        return AutostartResult(
            ok=True,
            platform="windows",
            method="startup_folder",
            message=f"Startup folder shortcut → {startup_cmd}",
            detail="Panel will start automatically on every login (Startup folder).",
        )
    except OSError as exc:
        return AutostartResult(
            ok=False,
            platform="windows",
            method="task_scheduler",
            message="Could not register auto-start",
            detail=f"schtasks: {r.stderr.strip()}  |  startup: {exc}",
        )


def _windows_disable() -> AutostartResult:
    subprocess.run(
        ["schtasks", "/delete", "/f", "/tn", WINDOWS_TASK_NAME],
        capture_output=True,
        check=False,
    )
    startup_cmd = _windows_startup_dir() / "crossborder-panel.cmd"
    startup_cmd.unlink(missing_ok=True)
    return AutostartResult(
        ok=True, platform="windows", method="task_scheduler", message="Auto-start removed"
    )


def _windows_status() -> AutostartResult:
    r = subprocess.run(
        ["schtasks", "/query", "/tn", WINDOWS_TASK_NAME],
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode == 0:
        return AutostartResult(
            ok=True,
            platform="windows",
            method="task_scheduler",
            message=f'Task Scheduler task "{WINDOWS_TASK_NAME}" registered',
        )
    startup_cmd = _windows_startup_dir() / "crossborder-panel.cmd"
    if startup_cmd.exists():
        return AutostartResult(
            ok=True,
            platform="windows",
            method="startup_folder",
            message=f"Startup folder: {startup_cmd}",
        )
    return AutostartResult(
        ok=False,
        platform="windows",
        method="task_scheduler",
        message="Not installed",
        detail="Run: crossborder deploy autostart",
    )


# ---------------------------------------------------------------------------
# Public API — platform dispatch
# ---------------------------------------------------------------------------


AutostartAction = Literal["enable", "disable", "status"]


def autostart(
    action: AutostartAction = "enable", port: int = DEFAULT_PANEL_PORT
) -> AutostartResult:
    """Enable, disable, or query auto-start for the current platform."""
    if sys.platform == "darwin":
        if action == "enable":
            return _launchd_enable(port)
        if action == "disable":
            return _launchd_disable()
        return _launchd_status()

    if sys.platform.startswith("linux"):
        from pathlib import Path as _Path

        system_mode = _Path("/run/systemd/system").exists() and _is_root()
        if action == "enable":
            return _systemd_enable(port, system=system_mode)
        if action == "disable":
            return _systemd_disable(system=system_mode)
        return _systemd_status(system=system_mode)

    if sys.platform == "win32":
        if action == "enable":
            return _windows_enable(port)
        if action == "disable":
            return _windows_disable()
        return _windows_status()

    return AutostartResult(
        ok=False,
        platform=sys.platform,
        method="none",
        message=f"Auto-start not supported on platform: {sys.platform}",
        detail="Use your OS init system to run: crossborder serve --no-reload",
    )


def _is_root() -> bool:
    import os

    return os.geteuid() == 0
