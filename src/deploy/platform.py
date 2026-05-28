"""Cross-platform detection for self-hosted installs."""

from __future__ import annotations

import platform
import shutil
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformInfo:
    system: str  # windows | linux | darwin
    machine: str
    is_windows: bool
    is_linux: bool
    is_macos: bool
    has_docker: bool
    has_compose: bool
    has_uv: bool
    has_systemd: bool
    shell: str


def detect_platform() -> PlatformInfo:
    sys_name = platform.system().lower()
    is_windows = sys_name == "windows"
    is_linux = sys_name == "linux"
    is_macos = sys_name == "darwin"

    has_docker = shutil.which("docker") is not None
    has_compose = shutil.which("docker-compose") is not None or (
        has_docker and _docker_compose_plugin()
    )
    has_uv = shutil.which("uv") is not None
    has_systemd = is_linux and Path_exists("/run/systemd/system")

    return PlatformInfo(
        system="windows" if is_windows else ("darwin" if is_macos else "linux"),
        machine=platform.machine().lower(),
        is_windows=is_windows,
        is_linux=is_linux,
        is_macos=is_macos,
        has_docker=has_docker,
        has_compose=has_compose,
        has_uv=has_uv,
        has_systemd=has_systemd,
        shell="powershell" if is_windows else "bash",
    )


def Path_exists(path: str) -> bool:
    from pathlib import Path

    return Path(path).exists()


def _docker_compose_plugin() -> bool:
    import subprocess

    try:
        proc = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            timeout=10,
            check=False,
        )
        return proc.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def compose_command() -> list[str]:
    """Docker Compose v2 or v1 executable argv prefix."""
    if shutil.which("docker") and _docker_compose_plugin():
        return ["docker", "compose"]
    if shutil.which("docker-compose"):
        return ["docker-compose"]
    return []


def python_executable() -> str:
    return sys.executable
