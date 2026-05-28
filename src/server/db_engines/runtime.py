"""Shared runtime helpers for database platform drivers (Docker exec, host CLI)."""

from __future__ import annotations

import subprocess
from typing import Any

from fastapi import HTTPException

from server.app_store import docker
from server.app_store.catalog import StorePluginDefinition
from server.db_engines.sql_errors import raise_cli_error


def docker_container_env(container: str) -> dict[str, str]:
    """Read container Config.Env as key/value (authoritative for Docker installs)."""
    proc = subprocess.run(
        ["docker", "inspect", container, "--format", "{{range .Config.Env}}{{.}}\n{{end}}"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if proc.returncode != 0:
        return {}
    env: dict[str, str] = {}
    for line in (proc.stdout or "").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key] = value
    return env


def resolve_admin_credentials(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    config: dict[str, Any],
) -> tuple[str, str]:
    """Panel config password can drift from the container after recreate — prefer live env."""
    admin_user = str(config.get("username") or "panel")
    admin_password = str(config.get("password") or "")
    if plugin.id == "mysql":
        admin_user = "root"
    container = None
    if record.get("mode") == "docker":
        container = str(config.get("container_name") or plugin.container_name)
    if container and docker.docker_cli_available():
        env = docker_container_env(container)
        if plugin.id == "mysql":
            admin_password = env.get("MYSQL_ROOT_PASSWORD") or admin_password
        elif plugin.id == "postgresql":
            admin_user = env.get("POSTGRES_USER") or admin_user
            admin_password = env.get("POSTGRES_PASSWORD") or admin_password
    return admin_user, admin_password


def docker_exec(
    container: str,
    cmd: list[str],
    *,
    env: dict[str, str] | None = None,
    timeout: int = 120,
) -> None:
    if not docker.docker_cli_available():
        raise HTTPException(status_code=503, detail="Docker is not available")
    full = ["docker", "exec"]
    if env:
        for key, value in env.items():
            full.extend(["-e", f"{key}={value}"])
    full.append(container)
    full.extend(cmd)
    proc = subprocess.run(full, capture_output=True, text=True, timeout=timeout, check=False)
    if proc.returncode != 0:
        raise_cli_error((proc.stderr or proc.stdout or f"exit {proc.returncode}").strip())


def run_cli(command: list[str], *, timeout: int = 120, env: dict[str, str] | None = None) -> None:
    run_cli_capture(command, timeout=timeout, env=env)


def run_cli_capture(
    command: list[str],
    *,
    timeout: int = 120,
    env: dict[str, str] | None = None,
) -> str:
    proc = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env=env,
    )
    if proc.returncode != 0:
        raise_cli_error((proc.stderr or proc.stdout or f"exit {proc.returncode}").strip())
    return proc.stdout or ""


def docker_exec_capture(
    container: str,
    cmd: list[str],
    *,
    env: dict[str, str] | None = None,
    timeout: int = 120,
) -> str:
    if not docker.docker_cli_available():
        raise HTTPException(status_code=503, detail="Docker is not available")
    full = ["docker", "exec"]
    if env:
        for key, value in env.items():
            full.extend(["-e", f"{key}={value}"])
    full.append(container)
    full.extend(cmd)
    proc = subprocess.run(full, capture_output=True, text=True, timeout=timeout, check=False)
    if proc.returncode != 0:
        raise_cli_error((proc.stderr or proc.stdout or f"exit {proc.returncode}").strip())
    return proc.stdout or ""
