"""MySQL / MariaDB logical database driver."""

from __future__ import annotations

import re
import shutil
import time

from fastapi import HTTPException

from server.db_engines.base import EngineRuntimeContext
from server.db_engines.runtime import docker_exec, docker_exec_capture, run_cli, run_cli_capture


def _charset_collation(charset: str) -> tuple[str, str]:
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


def _grant_hosts(access: str) -> list[str]:
    if access.strip().lower() == "remote":
        return ["%"]
    return ["localhost", "127.0.0.1"]


class MySQLDriver:
    platform_id = "mysql"

    def provision_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
        password: str,
        charset: str,
        access: str,
    ) -> None:
        cs, coll = _charset_collation(charset)
        hosts = _grant_hosts(access)
        parts = [
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET {cs} COLLATE {coll};",
        ]
        for host in hosts:
            parts.append(
                f"CREATE USER IF NOT EXISTS '{username}'@'{host}' IDENTIFIED BY '{password}';"
            )
            parts.append(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{username}'@'{host}';")
        parts.append("FLUSH PRIVILEGES;")
        self._run_admin_sql(ctx, " ".join(parts))

    def drop_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
    ) -> None:
        hosts = ["localhost", "127.0.0.1", "%"]
        parts = [f"DROP DATABASE IF EXISTS `{db_name}`;"]
        for host in hosts:
            parts.append(f"DROP USER IF EXISTS '{username}'@'{host}';")
        parts.append("FLUSH PRIVILEGES;")
        self._run_admin_sql(ctx, " ".join(parts))

    def optimize_logical(self, ctx: EngineRuntimeContext, *, db_name: str) -> None:
        if ctx.container:
            docker_exec(
                ctx.container,
                ["mysqlcheck", "-uroot", "-o", db_name],
                env={"MYSQL_PWD": ctx.admin_password},
            )
            return
        if not shutil.which("mysqlcheck"):
            raise HTTPException(
                status_code=503,
                detail="mysqlcheck not found on PATH; install MySQL client tools",
            )
        run_cli(
            ["mysqlcheck", "-h", "127.0.0.1", "-uroot", f"-p{ctx.admin_password}", "-o", db_name],
        )

    def set_logical_password(
        self,
        ctx: EngineRuntimeContext,
        *,
        username: str,
        password: str,
        access: str,
    ) -> None:
        hosts = _grant_hosts(access)
        parts = [f"ALTER USER '{username}'@'{host}' IDENTIFIED BY '{password}';" for host in hosts]
        parts.append("FLUSH PRIVILEGES;")
        self._run_admin_sql(ctx, " ".join(parts))

    def set_logical_access(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
        password: str,
        access: str,
    ) -> None:
        hosts = _grant_hosts(access)
        parts: list[str] = []
        for host in ("localhost", "127.0.0.1", "%"):
            if host not in hosts:
                parts.append(f"REVOKE ALL PRIVILEGES ON `{db_name}`.* FROM '{username}'@'{host}';")
                parts.append(f"DROP USER IF EXISTS '{username}'@'{host}';")
        for host in hosts:
            parts.append(
                f"CREATE USER IF NOT EXISTS '{username}'@'{host}' IDENTIFIED BY '{password}';"
            )
            parts.append(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{username}'@'{host}';")
        parts.append("FLUSH PRIVILEGES;")
        self._run_admin_sql(ctx, " ".join(parts))

    def list_tables(self, ctx: EngineRuntimeContext, *, db_name: str) -> list[dict]:
        sql = (
            "SELECT table_name, IFNULL(engine,''), table_type, IFNULL(table_rows,0), "
            "IFNULL(data_length+index_length,0), IFNULL(table_collation,'') "
            f"FROM information_schema.tables WHERE table_schema = '{db_name}' "
            "ORDER BY table_name"
        )
        raw = self._query_tsv(ctx, db_name, sql)
        items: list[dict] = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 5:
                continue
            items.append(
                {
                    "name": parts[0],
                    "engine": parts[1] or None,
                    "row_type": parts[2] or "BASE TABLE",
                    "rows": int(parts[3]) if parts[3].isdigit() else None,
                    "size_bytes": int(parts[4]) if parts[4].isdigit() else None,
                    "collation": parts[5] if len(parts) > 5 and parts[5] else None,
                }
            )
        return items

    def run_read_query(self, ctx: EngineRuntimeContext, *, db_name: str, sql: str) -> dict:
        raw = self._query_tsv(ctx, db_name, sql, include_header=True)
        lines = [line for line in raw.splitlines() if line.strip()]
        if not lines:
            return {"columns": [], "rows": []}
        columns = lines[0].split("\t")
        rows = [line.split("\t") for line in lines[1:]]
        return {"columns": columns, "rows": rows}

    def execute_sql(self, ctx: EngineRuntimeContext, *, db_name: str, sql: str) -> dict:
        started = time.perf_counter()
        if re.match(r"^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b", sql, re.I):
            out = self.run_read_query(ctx, db_name=db_name, sql=sql)
            out["elapsed_ms"] = round((time.perf_counter() - started) * 1000, 2)
            out["rows_affected"] = None
            return out
        self._run_db_sql(ctx, db_name, sql)
        elapsed = round((time.perf_counter() - started) * 1000, 2)
        return {
            "columns": [],
            "rows": [],
            "rows_affected": 0,
            "elapsed_ms": elapsed,
            "message": "Statement executed",
        }

    def list_columns(
        self, ctx: EngineRuntimeContext, *, db_name: str, table_name: str
    ) -> list[dict]:
        sql = (
            "SELECT column_name, column_type, is_nullable, column_default, column_key "
            f"FROM information_schema.columns WHERE table_schema = '{db_name}' "
            f"AND table_name = '{table_name}' ORDER BY ordinal_position"
        )
        raw = self._query_tsv(ctx, db_name, sql)
        items: list[dict] = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            p = line.split("\t")
            if len(p) < 4:
                continue
            items.append(
                {
                    "name": p[0],
                    "data_type": p[1],
                    "nullable": p[2].upper() == "YES",
                    "default": p[3] if p[3] != "NULL" else None,
                    "primary": p[4].upper() == "PRI" if len(p) > 4 else False,
                }
            )
        return items

    def create_table(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        table_name: str,
        columns: list[dict],
    ) -> None:
        defs: list[str] = []
        for col in columns:
            name = str(col.get("name") or "").strip()
            ctype = str(col.get("type") or "VARCHAR(255)").strip()
            part = f"`{name}` {ctype}"
            if col.get("primary"):
                part += " PRIMARY KEY"
            if col.get("auto_increment"):
                part += " AUTO_INCREMENT"
            if not col.get("nullable", True):
                part += " NOT NULL"
            default = col.get("default")
            if default is not None and str(default).strip():
                part += f" DEFAULT {_sql_default(default)}"
            defs.append(part)
        sql = (
            f"CREATE TABLE `{table_name}` ({', '.join(defs)}) "
            "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        )
        self._run_db_sql(ctx, db_name, sql)

    def add_column(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        table_name: str,
        column_name: str,
        column_type: str,
        nullable: bool = True,
        default: str | None = None,
    ) -> None:
        part = f"`{column_name}` {column_type}"
        if not nullable:
            part += " NOT NULL"
        if default is not None and str(default).strip():
            part += f" DEFAULT {_sql_default(default)}"
        sql = f"ALTER TABLE `{table_name}` ADD COLUMN {part}"
        self._run_db_sql(ctx, db_name, sql)

    def insert_row(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        table_name: str,
        values: dict,
    ) -> None:
        cols = ", ".join(f"`{k}`" for k in values)
        vals = ", ".join(_sql_literal(v) for v in values.values())
        sql = f"INSERT INTO `{table_name}` ({cols}) VALUES ({vals})"
        self._run_db_sql(ctx, db_name, sql)

    def _run_db_sql(self, ctx: EngineRuntimeContext, db_name: str, sql: str) -> None:
        cmd = ["mysql", "-uroot", f"-D{db_name}", "-e", sql]
        env = {"MYSQL_PWD": ctx.admin_password}
        if ctx.container:
            docker_exec(ctx.container, cmd, env=env)
            return
        if not shutil.which("mysql"):
            raise HTTPException(status_code=503, detail="mysql client not found on PATH")
        run_cli(
            [
                "mysql",
                "-h",
                "127.0.0.1",
                "-uroot",
                f"-p{ctx.admin_password}",
                f"-D{db_name}",
                "-e",
                sql,
            ]
        )

    def _query_tsv(
        self,
        ctx: EngineRuntimeContext,
        db_name: str,
        sql: str,
        *,
        include_header: bool = False,
    ) -> str:
        cmd = ["mysql", "-uroot", f"-D{db_name}"]
        if not include_header:
            cmd.append("-N")
        cmd.extend(["-B", "-e", sql])
        env = {"MYSQL_PWD": ctx.admin_password}
        if ctx.container:
            return docker_exec_capture(ctx.container, cmd, env=env)
        if not shutil.which("mysql"):
            raise HTTPException(status_code=503, detail="mysql client not found on PATH")
        host_cmd = ["mysql", "-h", "127.0.0.1", "-uroot", f"-p{ctx.admin_password}", f"-D{db_name}"]
        if not include_header:
            host_cmd.append("-N")
        host_cmd.extend(["-B", "-e", sql])
        return run_cli_capture(host_cmd)

    def _run_admin_sql(self, ctx: EngineRuntimeContext, sql: str) -> None:
        if ctx.container:
            docker_exec(
                ctx.container,
                ["mysql", "-uroot", "-e", sql],
                env={"MYSQL_PWD": ctx.admin_password},
            )
            return
        if not shutil.which("mysql"):
            raise HTTPException(status_code=503, detail="mysql client not found on PATH")
        run_cli(["mysql", "-h", "127.0.0.1", "-uroot", f"-p{ctx.admin_password}", "-e", sql])


def _sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int | float):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def _sql_default(value: object) -> str:
    if isinstance(value, int | float) and not isinstance(value, bool):
        return str(value)
    text = str(value).strip()
    if text.upper() in ("NULL", "CURRENT_TIMESTAMP", "NOW()"):
        return text.upper() if text.upper() == "NULL" else "CURRENT_TIMESTAMP"
    return _sql_literal(value)
