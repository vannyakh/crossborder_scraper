"""Docker Compose helpers for the panel app store."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any


def docker_cli_available() -> bool:
    if not shutil.which("docker"):
        return False
    try:
        proc = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=15,
            check=False,
        )
        return proc.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def compose_cli_available() -> bool:
    if shutil.which("docker"):
        try:
            proc = subprocess.run(
                ["docker", "compose", "version"],
                capture_output=True,
                timeout=10,
                check=False,
            )
            if proc.returncode == 0:
                return True
        except (OSError, subprocess.TimeoutExpired):
            pass
    return bool(shutil.which("docker-compose"))


def _compose_cmd(plugin_dir: Path) -> list[str]:
    if shutil.which("docker"):
        return ["docker", "compose", "-f", str(plugin_dir / "docker-compose.yml")]
    return ["docker-compose", "-f", str(plugin_dir / "docker-compose.yml")]


def run_compose(plugin_dir: Path, *args: str, timeout: int = 180) -> tuple[int, str, str]:
    cmd = [*_compose_cmd(plugin_dir), *args]
    proc = subprocess.run(
        cmd,
        cwd=str(plugin_dir),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def compose_up(plugin_dir: Path) -> tuple[bool, str]:
    code, stdout, stderr = run_compose(plugin_dir, "up", "-d")
    if code != 0:
        return False, (stderr or stdout or f"exit {code}").strip()
    return True, (stdout or "started").strip()


def compose_stop(plugin_dir: Path) -> tuple[bool, str]:
    code, stdout, stderr = run_compose(plugin_dir, "stop")
    if code != 0:
        return False, (stderr or stdout or f"exit {code}").strip()
    return True, (stdout or "stopped").strip()


def compose_start(plugin_dir: Path) -> tuple[bool, str]:
    code, stdout, stderr = run_compose(plugin_dir, "start")
    if code != 0:
        return False, (stderr or stdout or f"exit {code}").strip()
    return True, (stdout or "started").strip()


def compose_down(plugin_dir: Path, *, volumes: bool = False) -> tuple[bool, str]:
    args = ["down"]
    if volumes:
        args.append("-v")
    code, stdout, stderr = run_compose(plugin_dir, *args)
    if code != 0:
        return False, (stderr or stdout or f"exit {code}").strip()
    return True, (stdout or "removed").strip()


def compose_logs(plugin_dir: Path, *, tail: int = 200) -> str:
    """Return the last *tail* lines of compose service logs as a plain string."""
    code, stdout, stderr = run_compose(plugin_dir, "logs", "--no-color", f"--tail={tail}")
    return (stdout or stderr or "").strip()


def container_running(name: str) -> bool:
    if not name or not docker_cli_available():
        return False
    try:
        proc = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", name],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        return proc.returncode == 0 and proc.stdout.strip().lower() == "true"
    except (OSError, subprocess.TimeoutExpired):
        return False


def environment_info() -> dict[str, Any]:
    return {
        "docker_available": docker_cli_available(),
        "compose_available": compose_cli_available(),
    }
