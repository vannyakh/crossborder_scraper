"""Install Docker Engine on Linux hosts (self-host / VPS)."""

from __future__ import annotations

import shutil
import subprocess
from typing import Any

from deploy.platform import detect_platform


def docker_binary_present() -> bool:
    return shutil.which("docker") is not None


def run_install(*, username: str = "panel") -> dict[str, Any]:
    plat = detect_platform()
    messages: list[str] = []

    if docker_binary_present():
        return {
            "ok": True,
            "already_installed": True,
            "messages": ["Docker CLI is already on PATH"],
        }

    if not plat.is_linux:
        return {
            "ok": False,
            "messages": [
                "Automatic Docker install is supported on Linux VPS hosts only. "
                "Install Docker Desktop or Engine manually, then refresh this page.",
            ],
        }

    if shutil.which("apt-get"):
        apt_script = (
            "export DEBIAN_FRONTEND=noninteractive && "
            "apt-get update -qq && "
            "apt-get install -y -qq ca-certificates curl gnupg && "
            "install -m 0755 -d /etc/apt/keyrings && "
            "curl -fsSL https://download.docker.com/linux/ubuntu/gpg "
            "-o /etc/apt/keyrings/docker.asc && "
            "chmod a+r /etc/apt/keyrings/docker.asc && "
            'echo "deb [arch=$(dpkg --print-architecture) '
            "signed-by=/etc/apt/keyrings/docker.asc] "
            "https://download.docker.com/linux/ubuntu "
            '$(. /etc/os-release && echo ${VERSION_CODENAME}) stable" '
            "> /etc/apt/sources.list.d/docker.list && "
            "apt-get update -qq && "
            "apt-get install -y -qq docker-ce docker-ce-cli containerd.io "
            "docker-buildx-plugin docker-compose-plugin"
        )
        cmd = ["sh", "-c", apt_script]
        label = "apt (Docker CE + Compose plugin)"
    else:
        cmd = ["sh", "-c", "curl -fsSL https://get.docker.com | sh"]
        label = "get.docker.com script"

    messages.append(f"Running install via {label} (requires root or sudo)…")

    proc = _run_privileged(cmd, timeout=900)
    out = (proc.stdout or proc.stderr or "").strip()
    if out:
        messages.extend(out.splitlines()[-8:])

    if proc.returncode != 0:
        return {
            "ok": False,
            "messages": messages
            + [
                f"Install exited with code {proc.returncode}. "
                "Run on the VPS as root: curl -fsSL https://get.docker.com | sh",
            ],
        }

    if shutil.which("systemctl"):
        svc = _run_privileged(["systemctl", "enable", "--now", "docker"], timeout=60)
        if svc.returncode == 0:
            messages.append("Enabled and started docker service")
        else:
            messages.append("Docker installed; start the docker service if needed")

    return {
        "ok": True,
        "already_installed": False,
        "messages": messages + ["Docker install finished — refresh status"],
    }


def run_service_action(action: str) -> dict[str, Any]:
    if action not in ("start", "stop", "restart"):
        return {"ok": False, "message": f"unknown action: {action}"}

    if not shutil.which("systemctl"):
        return {"ok": False, "message": "systemctl not available on this host"}

    proc = _run_privileged(["systemctl", action, "docker"], timeout=120)
    ok = proc.returncode == 0
    detail = (proc.stdout or proc.stderr or "").strip()
    return {
        "ok": ok,
        "action": action,
        "message": detail or (f"docker service {action} {'ok' if ok else 'failed'}"),
    }


def _run_privileged(argv: list[str], *, timeout: int) -> subprocess.CompletedProcess[str]:
    try:
        import os

        if os.geteuid() == 0:
            return subprocess.run(
                argv,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
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
        )

    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
