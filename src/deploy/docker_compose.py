"""Docker Compose helpers for self-hosted deploy."""

from __future__ import annotations

import subprocess
from pathlib import Path

from core.paths import repo_root
from deploy.platform import compose_command, detect_platform


def compose_file_paths() -> list[Path]:
    root = repo_root()
    files = [root / "docker-compose.yml"]
    prod = root / "docker-compose.prod.yml"
    if prod.is_file():
        files.append(prod)
    return files


def run_compose(*args: str, cwd: Path | None = None) -> int:
    cmd = compose_command()
    if not cmd:
        raise RuntimeError("docker compose not found — install Docker Engine")
    compose_args = [str(f) for f in compose_file_paths()]
    file_flags: list[str] = []
    for f in compose_args:
        file_flags.extend(["-f", f])
    full = [*cmd, *file_flags, *args]
    return subprocess.run(full, cwd=cwd or repo_root(), check=False).returncode


def compose_up(*, detach: bool = True, build: bool = True) -> int:
    args = ["up"]
    if detach:
        args.append("-d")
    if build:
        args.append("--build")
    return run_compose(*args)


def compose_down() -> int:
    return run_compose("down")


def compose_status() -> int:
    return run_compose("ps")


def compose_restart() -> int:
    return run_compose("restart")


def compose_status_running() -> bool:
    """True if compose reports at least one running service."""
    import subprocess

    from deploy.platform import compose_command

    cmd = compose_command()
    if not cmd:
        return False
    file_flags: list[str] = []
    for f in compose_file_paths():
        file_flags.extend(["-f", str(f)])
    full = [*cmd, *file_flags, "ps", "--status", "running", "-q"]
    try:
        proc = subprocess.run(
            full,
            cwd=repo_root(),
            capture_output=True,
            text=True,
            check=False,
        )
        return bool(proc.stdout.strip())
    except OSError:
        return False


def docker_ready() -> bool:
    plat = detect_platform()
    return plat.has_docker and plat.has_compose
