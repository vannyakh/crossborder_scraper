"""Create logical databases and users on managed store engines."""

from __future__ import annotations

import re
import secrets
import shutil
import subprocess
from typing import Any

from fastapi import HTTPException

from server.app_store import docker
from server.app_store.catalog import StorePluginDefinition

_NAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")
_SUPPORTED = frozenset({"mysql", "postgresql", "mongodb"})


def supports_multiple_databases(plugin_id: str) -> bool:
    return plugin_id in _SUPPORTED


def generate_db_username() -> str:
    return f"u{secrets.token_hex(4)}"


def generate_db_password() -> str:
    return secrets.token_urlsafe(16)


def validate_db_name(name: str) -> str:
    cleaned = name.strip()
    if not _NAME_RE.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail="database name must start with a letter and use letters, digits, or underscore",
        )
    return cleaned


def _admin_config(record: dict[str, Any]) -> dict[str, Any]:
    return dict(record.get("config") or {})


def _docker_exec(
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
        detail = (proc.stderr or proc.stdout or f"exit {proc.returncode}").strip()
        raise HTTPException(status_code=500, detail=detail[:500])


def _run_cli(command: list[str], *, timeout: int = 120) -> None:
    proc = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or f"exit {proc.returncode}").strip()
        raise HTTPException(status_code=500, detail=detail[:500])


def _mysql_charset_collation(charset: str) -> tuple[str, str]:
    key = charset.strip().lower().replace("-", "")
    if key in ("utf8", "utf8mb4"):
        return "utf8mb4", "utf8mb4_unicode_ci"
    if key == "gbk":
        return "gbk", "gbk_chinese_ci"
    if key == "big5":
        return "big5", "big5_chinese_ci"
    if key == "latin1":
        return "latin1", "latin1_swedish_ci"
    return key, f"{key}_unicode_ci"


def _mysql_grant_hosts(access: str) -> list[str]:
    if access.strip().lower() == "remote":
        return ["%"]
    return ["localhost", "127.0.0.1"]


def _provision_mysql(
    *,
    container: str | None,
    admin_password: str,
    db_name: str,
    username: str,
    password: str,
    charset: str,
    access: str = "local",
) -> None:
    cs, coll = _mysql_charset_collation(charset)
    hosts = _mysql_grant_hosts(access)
    parts = [
        f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET {cs} COLLATE {coll};",
    ]
    for host in hosts:
        parts.append(f"CREATE USER IF NOT EXISTS '{username}'@'{host}' IDENTIFIED BY '{password}';")
        parts.append(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{username}'@'{host}';")
    parts.append("FLUSH PRIVILEGES;")
    sql = " ".join(parts)
    if container:
        _docker_exec(
            container,
            ["mysql", "-uroot", "-e", sql],
            env={"MYSQL_PWD": admin_password},
        )
        return
    if not shutil.which("mysql"):
        raise HTTPException(status_code=503, detail="mysql client not found on PATH")
    _run_cli(["mysql", "-h", "127.0.0.1", "-uroot", f"-p{admin_password}", "-e", sql])


def _provision_postgresql(
    *,
    container: str | None,
    admin_user: str,
    admin_password: str,
    db_name: str,
    username: str,
    password: str,
) -> None:
    if container:
        _docker_exec(
            container,
            [
                "psql",
                "-U",
                admin_user,
                "-d",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                f"CREATE DATABASE {db_name};",
            ],
            env={"PGPASSWORD": admin_password},
        )
        _docker_exec(
            container,
            [
                "psql",
                "-U",
                admin_user,
                "-d",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                f"CREATE USER {username} WITH PASSWORD '{password}';",
            ],
            env={"PGPASSWORD": admin_password},
        )
        _docker_exec(
            container,
            [
                "psql",
                "-U",
                admin_user,
                "-d",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {username};",
            ],
            env={"PGPASSWORD": admin_password},
        )
        return
    if not shutil.which("psql"):
        raise HTTPException(status_code=503, detail="psql client not found on PATH")
    base = [
        "psql",
        "-h",
        "127.0.0.1",
        "-U",
        admin_user,
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
    ]
    env = {"PGPASSWORD": admin_password}
    for stmt in (
        f"CREATE DATABASE {db_name};",
        f"CREATE USER {username} WITH PASSWORD '{password}';",
        f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {username};",
    ):
        proc = subprocess.run(
            [*base, stmt],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
            env=env,
        )
        if proc.returncode != 0 and "already exists" not in (proc.stderr or proc.stdout).lower():
            raise HTTPException(
                status_code=500,
                detail=(proc.stderr or proc.stdout or "psql failed")[:500],
            )


def _provision_mongodb(
    *,
    container: str | None,
    admin_user: str,
    admin_password: str,
    db_name: str,
    username: str,
    password: str,
) -> None:
    script = (
        f"db.getSiblingDB('{db_name}').createUser({{user: '{username}', "
        f"pwd: '{password}', roles: [{{role: 'readWrite', db: '{db_name}'}}]}});"
    )
    if container:
        _docker_exec(
            container,
            [
                "mongosh",
                "--quiet",
                "-u",
                admin_user,
                "-p",
                admin_password,
                "--authenticationDatabase",
                "admin",
                "--eval",
                script,
            ],
        )
        return
    if not shutil.which("mongosh") and not shutil.which("mongo"):
        raise HTTPException(status_code=503, detail="mongosh client not found on PATH")
    cli = "mongosh" if shutil.which("mongosh") else "mongo"
    _run_cli(
        [
            cli,
            "--quiet",
            "-u",
            admin_user,
            "-p",
            admin_password,
            "--authenticationDatabase",
            "admin",
            "--eval",
            script,
        ],
    )


def provision_database(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    username: str,
    password: str,
    charset: str = "utf8mb4",
    access: str = "local",
) -> None:
    if plugin.id not in _SUPPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support creating multiple databases from the panel",
        )

    config = _admin_config(record)
    admin_password = str(config.get("password") or "")
    if not admin_password:
        raise HTTPException(status_code=400, detail="admin password missing for this service")

    container = None
    if record.get("mode") == "docker":
        container = str(config.get("container_name") or plugin.container_name)

    if plugin.id == "mysql":
        _provision_mysql(
            container=container,
            admin_password=admin_password,
            db_name=db_name,
            username=username,
            password=password,
            charset=charset,
            access=access,
        )
    elif plugin.id == "postgresql":
        _provision_postgresql(
            container=container,
            admin_user=str(config.get("username") or "panel"),
            admin_password=admin_password,
            db_name=db_name,
            username=username,
            password=password,
        )
    elif plugin.id == "mongodb":
        _provision_mongodb(
            container=container,
            admin_user=str(config.get("username") or "panel"),
            admin_password=admin_password,
            db_name=db_name,
            username=username,
            password=password,
        )


def list_databases_from_record(record: dict[str, Any]) -> list[dict[str, Any]]:
    config = _admin_config(record)
    stored = config.get("databases")
    if isinstance(stored, list) and stored:
        return [dict(row) for row in stored if isinstance(row, dict)]

    legacy: list[dict[str, Any]] = []
    if config.get("database"):
        legacy.append(
            {
                "name": str(config.get("database")),
                "username": config.get("username"),
                "password": config.get("password"),
                "charset": "utf8mb4",
                "legacy": True,
            }
        )
    return legacy
