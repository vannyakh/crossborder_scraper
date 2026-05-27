"""VPS network access — host firewall, panel bind, and cloud security group guidance."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from typing import Any

from deploy.firewall import (
    get_listen_addresses,
    is_publicly_bound,
    probe_local_health,
    try_open_tcp_port,
)
from deploy.network import detect_public_ip, normalize_bind_host


def _run(cmd: list[str], *, timeout: int = 20) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _can_sudo(cmd: list[str]) -> bool:
    if os.geteuid() == 0:
        return True
    if not shutil.which("sudo"):
        return False
    probe = ["sudo", "-n", *cmd]
    try:
        return _run(probe, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def _exec_firewall(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    if os.geteuid() == 0:
        return _run(cmd)
    if _can_sudo(cmd):
        return _run(["sudo", "-n", *cmd])
    return _run(cmd)


def ufw_status(port: int) -> dict[str, Any]:
    """Inspect ufw installation and whether panel/SSH ports are allowed."""
    info: dict[str, Any] = {
        "installed": False,
        "active": False,
        "port_allowed": False,
        "ssh_allowed": False,
        "summary": "not installed",
    }
    if not shutil.which("ufw"):
        return info

    info["installed"] = True
    try:
        status = _run(["ufw", "status"], timeout=8)
    except (OSError, subprocess.TimeoutExpired):
        info["summary"] = "status unavailable"
        return info

    text = (status.stdout or "") + (status.stderr or "")
    info["active"] = status.returncode == 0 and "active" in text.lower()
    port_pat = re.compile(rf"\b{port}\b")
    info["port_allowed"] = bool(port_pat.search(text) and "/tcp" in text)
    info["ssh_allowed"] = "22/tcp" in text or "OpenSSH" in text
    if info["active"]:
        if info["port_allowed"]:
            info["summary"] = f"active — TCP {port} allowed"
        else:
            info["summary"] = f"active — TCP {port} not listed"
    else:
        info["summary"] = "installed but inactive"
    return info


def firewalld_status(port: int) -> dict[str, Any]:
    info: dict[str, Any] = {
        "installed": False,
        "active": False,
        "port_allowed": False,
        "summary": "not installed",
    }
    if not shutil.which("firewall-cmd"):
        return info
    info["installed"] = True
    try:
        state = _run(["firewall-cmd", "--state"], timeout=8)
        info["active"] = state.returncode == 0 and "running" in (state.stdout or "").lower()
        if info["active"]:
            ports = _run(["firewall-cmd", "--list-ports"], timeout=8)
            text = ports.stdout or ""
            info["port_allowed"] = f"{port}/tcp" in text
            info["summary"] = (
                f"running — TCP {port} allowed"
                if info["port_allowed"]
                else f"running — TCP {port} not open"
            )
        else:
            info["summary"] = "installed but not running"
    except (OSError, subprocess.TimeoutExpired):
        info["summary"] = "status unavailable"
    return info


def cloud_security_group_rule(*, port: int, source: str = "0.0.0.0/0") -> dict[str, str]:
    """Structured inbound rule for copy/paste into a cloud console."""
    return {
        "direction": "inbound",
        "protocol": "TCP",
        "port": str(port),
        "source": source,
        "action": "allow",
        "description": "Crossborder panel",
    }


def cloud_console_steps(*, port: int) -> list[str]:
    return [
        "Open your cloud provider console → compute instance → security group (or firewall).",
        "Add an inbound rule: protocol TCP, port "
        f"{port}, source 0.0.0.0/0 (or your IP only for tighter access).",
        "Save the rule and wait ~1 minute for it to apply.",
        f"Test from your PC: use the entrance URL from the install card (bare IP:port returns 404)",
    ]


def ensure_panel_bind_env(*, host: str = "0.0.0.0") -> list[str]:
    """Write PANEL_HOST=0.0.0.0 to .env when missing or loopback-only."""
    from deploy.panel_access import configure_panel_bind

    bind = normalize_bind_host(host)
    current_host, port, _ = configure_panel_bind(host=bind, auto_port=False)
    if current_host == bind:
        return [f"panel bind: {bind}:{port} (.env)"]
    return [f"panel bind updated: {bind}:{port} (.env)"]


def enable_ufw_with_ports(*, panel_port: int, allow_ssh: bool = True) -> list[str]:
    """
    Enable ufw with deny incoming default, allow SSH and panel port.

    Requires root or passwordless sudo.
    """
    lines: list[str] = []
    if not shutil.which("ufw"):
        lines.append("ufw: not installed (apt install ufw)")
        return lines

    status = ufw_status(panel_port)
    if status.get("active") and status.get("port_allowed"):
        lines.append(f"ufw: already active with TCP {panel_port}")
        return lines

    if os.geteuid() != 0 and not _can_sudo(["ufw", "status"]):
        lines.append("ufw: needs root or passwordless sudo (run: crossborder deploy firewall)")
        return lines

    steps = [
        ["ufw", "default", "deny", "incoming"],
        ["ufw", "default", "allow", "outgoing"],
    ]
    if allow_ssh:
        steps.append(["ufw", "allow", "22/tcp"])
    steps.append(["ufw", "allow", f"{panel_port}/tcp"])
    steps.append(["ufw", "--force", "enable"])

    for cmd in steps:
        result = _exec_firewall(cmd)
        if result.returncode != 0:
            err = (result.stderr or result.stdout or "").strip()
            lines.append(f"ufw: {' '.join(cmd)} failed ({err or result.returncode})")
            return lines

    _exec_firewall(["ufw", "reload"])
    lines.append(f"ufw: enabled — allowed SSH + TCP {panel_port}")
    return lines


def run_host_firewall_setup(
    port: int,
    *,
    enable_ufw: bool = False,
    allow_ssh: bool = True,
) -> list[str]:
    """Open panel port in ufw/firewalld; optionally enable ufw."""
    lines: list[str] = []
    if enable_ufw:
        lines.extend(enable_ufw_with_ports(panel_port=port, allow_ssh=allow_ssh))
    lines.extend(try_open_tcp_port(port))
    if not lines:
        lines.append("host firewall: no ufw/firewalld changes (open port in cloud security group)")
    return lines


def build_network_access_status(
    *,
    port: int,
    bind_host: str | None = None,
    external_host: str | None = None,
) -> dict[str, Any]:
    """Full report for CLI, API, and settings panel."""
    from config import get_settings

    settings = get_settings()
    host = normalize_bind_host(bind_host or settings.panel_host)
    ext = external_host or settings.panel_external_host or detect_public_ip()
    listen = get_listen_addresses(port)
    public_bind = is_publicly_bound(port)
    local_ok = probe_local_health(port)

    from deploy.panel_security import build_login_url, health_path, normalize_entry_path

    try:
        entry = normalize_entry_path(get_settings().panel_entry_path)
    except Exception:
        entry = None

    health_url = f"http://127.0.0.1:{port}{health_path(entry)}"

    checks: list[dict[str, Any]] = [
        {
            "id": "panel_listen",
            "label": "Panel TCP listener",
            "ok": bool(listen),
            "detail": ", ".join(listen) if listen else "not listening — start: crossborder serve",
        },
        {
            "id": "public_bind",
            "label": "Bind on all interfaces",
            "ok": public_bind and host in ("0.0.0.0", "::"),
            "detail": f"PANEL_HOST={host} — need 0.0.0.0 for public access",
        },
        {
            "id": "local_health",
            "label": "Local /health",
            "ok": local_ok,
            "detail": health_url,
        },
        {
            "id": "ufw",
            "label": "Host firewall (ufw)",
            "ok": ufw_status(port).get("port_allowed") or not ufw_status(port).get("active"),
            "detail": ufw_status(port).get("summary", ""),
        },
        {
            "id": "firewalld",
            "label": "Host firewall (firewalld)",
            "ok": firewalld_status(port).get("port_allowed")
            or not firewalld_status(port).get("active"),
            "detail": firewalld_status(port).get("summary", ""),
        },
        {
            "id": "cloud_sg",
            "label": "Cloud security group",
            "ok": None,
            "detail": f"Allow inbound TCP {port} in your cloud console (cannot verify from server)",
        },
    ]

    login_urls: dict[str, str | None] = {
        "local": build_login_url("127.0.0.1", port, entry),
        "public": build_login_url(ext, port, entry) if ext else None,
    }

    return {
        "port": port,
        "bind_host": host,
        "external_host": ext,
        "listening": listen,
        "public_bind": public_bind,
        "local_health": local_ok,
        "ufw": ufw_status(port),
        "firewalld": firewalld_status(port),
        "cloud_rule": cloud_security_group_rule(port=port),
        "cloud_steps": cloud_console_steps(port=port),
        "checks": checks,
        "login_urls": login_urls,
        "can_manage_host_firewall": os.geteuid() == 0
        or _can_sudo(["ufw", "status"])
        or bool(shutil.which("ufw")),
        "platform": sys.platform,
    }


def run_full_access_setup(
    port: int,
    *,
    ensure_bind: bool = True,
    enable_ufw: bool = True,
    open_firewall: bool = True,
    persist_external: bool = True,
) -> dict[str, Any]:
    """One-shot VPS access setup (install / panel settings)."""
    messages: list[str] = []
    if ensure_bind:
        messages.extend(ensure_panel_bind_env(host="0.0.0.0"))
    if open_firewall:
        messages.extend(
            run_host_firewall_setup(port, enable_ufw=enable_ufw, allow_ssh=True)
        )
    if persist_external:
        from deploy.panel_access import persist_external_host

        ext = persist_external_host("auto")
        if ext:
            messages.append(f"public host: {ext} (PANEL_EXTERNAL_HOST)")
    status = build_network_access_status(port=port)
    status["messages"] = messages
    status["ok"] = bool(status.get("local_health")) and status.get("public_bind", False)
    return status
