"""PostgreSQL logical database driver."""

from __future__ import annotations

import re
import shutil
import subprocess
import time

from fastapi import HTTPException

from server.db_engines.base import EngineRuntimeContext
from server.db_engines.runtime import docker_exec, docker_exec_capture, run_cli_capture


class PostgreSQLDriver:
    platform_id = "postgresql"

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
        del charset, access
        stmts = (
            f"CREATE DATABASE {db_name};",
            f"CREATE USER {username} WITH PASSWORD '{password}';",
            f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {username};",
        )
        self._run_sql(ctx, stmts, ignore_exists=True)

    def drop_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
    ) -> None:
        stmts = (
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' "
            "AND pid <> pg_backend_pid();",
            f"DROP DATABASE IF EXISTS {db_name};",
            f"DROP USER IF EXISTS {username};",
        )
        self._run_sql(ctx, stmts, ignore_exists=False)

    def optimize_logical(self, ctx: EngineRuntimeContext, *, db_name: str) -> None:
        self._run_sql(ctx, (f"VACUUM FULL {db_name};",), ignore_exists=False)

    def set_logical_password(
        self,
        ctx: EngineRuntimeContext,
        *,
        username: str,
        password: str,
        access: str,
    ) -> None:
        del access
        self._run_sql(
            ctx,
            (f"ALTER USER {username} WITH PASSWORD '{password}';",),
            ignore_exists=False,
        )

    def list_tables(self, ctx: EngineRuntimeContext, *, db_name: str) -> list[dict]:
        sql = (
            "SELECT c.relname, COALESCE(am.amname,''), "
            "CASE c.relkind WHEN 'r' THEN 'BASE TABLE' WHEN 'v' THEN 'VIEW' "
            "ELSE c.relkind::text END, "
            "COALESCE(c.reltuples::bigint,0), COALESCE(pg_total_relation_size(c.oid),0) "
            "FROM pg_class c "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            "LEFT JOIN pg_am am ON am.oid = c.relam "
            "WHERE n.nspname = 'public' AND c.relkind IN ('r','v') "
            "ORDER BY c.relname"
        )
        raw = self._query_tsv(ctx, db_name, sql)
        items: list[dict] = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            parts = line.split("|")
            if len(parts) < 5:
                parts = line.split("\t")
            if len(parts) < 5:
                continue
            items.append(
                {
                    "name": parts[0],
                    "engine": parts[1] or None,
                    "row_type": parts[2] or "BASE TABLE",
                    "rows": int(float(parts[3])) if parts[3] else None,
                    "size_bytes": int(parts[4]) if parts[4].isdigit() else None,
                    "collation": None,
                }
            )
        return items

    def run_read_query(self, ctx: EngineRuntimeContext, *, db_name: str, sql: str) -> dict:
        raw = self._query_tsv(ctx, db_name, sql, include_header=True)
        lines = [line for line in raw.splitlines() if line.strip()]
        if not lines:
            return {"columns": [], "rows": []}
        sep = "|" if "|" in lines[0] and "\t" not in lines[0] else "\t"
        columns = lines[0].split(sep)
        rows = [line.split(sep) for line in lines[1:]]
        return {"columns": columns, "rows": rows}

    def execute_sql(self, ctx: EngineRuntimeContext, *, db_name: str, sql: str) -> dict:
        started = time.perf_counter()
        if re.match(r"^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b", sql, re.I):
            out = self.run_read_query(ctx, db_name=db_name, sql=sql)
            out["elapsed_ms"] = round((time.perf_counter() - started) * 1000, 2)
            out["rows_affected"] = None
            return out
        self._exec_db(ctx, db_name, sql)
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
            "SELECT column_name, data_type, is_nullable, column_default "
            "FROM information_schema.columns "
            f"WHERE table_catalog = '{db_name}' AND table_schema = 'public' "
            f"AND table_name = '{table_name}' ORDER BY ordinal_position"
        )
        raw = self._query_tsv(ctx, db_name, sql)
        items: list[dict] = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            p = line.split("|")
            if len(p) < 4:
                p = line.split("\t")
            items.append(
                {
                    "name": p[0],
                    "data_type": p[1],
                    "nullable": str(p[2]).upper() == "YES",
                    "default": p[3] if p[3] not in ("", "NULL") else None,
                    "primary": False,
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
            ctype = str(col.get("type") or "TEXT").strip()
            part = f'"{name}" {ctype}'
            if col.get("primary"):
                part += " PRIMARY KEY"
            if not col.get("nullable", True):
                part += " NOT NULL"
            default = col.get("default")
            if default is not None and str(default).strip():
                part += f" DEFAULT {default}"
            defs.append(part)
        sql = f'CREATE TABLE "{table_name}" ({", ".join(defs)})'
        self._exec_db(ctx, db_name, sql)

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
        part = f'"{column_name}" {column_type}'
        if not nullable:
            part += " NOT NULL"
        if default is not None and str(default).strip():
            part += f" DEFAULT {default}"
        sql = f'ALTER TABLE "{table_name}" ADD COLUMN {part}'
        self._exec_db(ctx, db_name, sql)

    def insert_row(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        table_name: str,
        values: dict,
    ) -> None:
        cols = ", ".join(f'"{k}"' for k in values)
        vals = ", ".join(_pg_literal(v) for v in values.values())
        sql = f'INSERT INTO "{table_name}" ({cols}) VALUES ({vals})'
        self._exec_db(ctx, db_name, sql)

    def _exec_db(self, ctx: EngineRuntimeContext, db_name: str, sql: str) -> None:
        self._run_sql(ctx, (sql,), ignore_exists=False, database=db_name)

    def _query_tsv(
        self,
        ctx: EngineRuntimeContext,
        db_name: str,
        sql: str,
        *,
        include_header: bool = False,
    ) -> str:
        flags = ["-A", "-F", "|"]
        if not include_header:
            flags.append("-t")
        cmd = ["psql", "-U", ctx.admin_user, "-d", db_name, *flags, "-c", sql]
        env = {"PGPASSWORD": ctx.admin_password}
        if ctx.container:
            return docker_exec_capture(ctx.container, cmd, env=env)
        if not shutil.which("psql"):
            raise HTTPException(status_code=503, detail="psql client not found on PATH")
        host_cmd = [
            "psql",
            "-h",
            "127.0.0.1",
            "-U",
            ctx.admin_user,
            "-d",
            db_name,
            *flags,
            "-c",
            sql,
        ]
        return run_cli_capture(host_cmd, env=env)

    def _run_sql(
        self,
        ctx: EngineRuntimeContext,
        stmts: tuple[str, ...],
        *,
        ignore_exists: bool,
        database: str = "postgres",
    ) -> None:
        if ctx.container:
            for stmt in stmts:
                docker_exec(
                    ctx.container,
                    [
                        "psql",
                        "-U",
                        ctx.admin_user,
                        "-d",
                        database,
                        "-v",
                        "ON_ERROR_STOP=1",
                        "-c",
                        stmt,
                    ],
                    env={"PGPASSWORD": ctx.admin_password},
                )
            return
        if not shutil.which("psql"):
            raise HTTPException(status_code=503, detail="psql client not found on PATH")
        base = [
            "psql",
            "-h",
            "127.0.0.1",
            "-U",
            ctx.admin_user,
            "-d",
            database,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
        ]
        env = {"PGPASSWORD": ctx.admin_password}
        for stmt in stmts:
            proc = subprocess.run(
                [*base, stmt],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
                env=env,
            )
            err = (proc.stderr or proc.stdout or "").lower()
            if proc.returncode != 0:
                if ignore_exists and "already exists" in err:
                    continue
                if not ignore_exists and "does not exist" in err:
                    continue
                raise HTTPException(
                    status_code=500,
                    detail=(proc.stderr or proc.stdout or "psql failed")[:500],
                )


def _pg_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int | float):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"
