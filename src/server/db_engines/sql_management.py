"""Panel SQL management — DDL/DML with safety guards (not read-only test mode)."""

from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException

from server.app_store.catalog import StorePluginDefinition
from server.db_engines.catalog import validate_db_name
from server.db_engines.registry import get_driver, runtime_context
from server.db_engines.sql_errors import reraise_as_client_error
from server.db_engines.sql_keywords import complete_prefix

_COLUMN_TYPE = re.compile(
    r"^[A-Z][A-Z0-9_]*(\s*\(\s*[0-9]+(\s*,\s*[0-9]+)?\s*\))?$",
    re.IGNORECASE,
)
_INTEGER_TYPES = frozenset({"TINYINT", "SMALLINT", "MEDIUMINT", "INT", "INTEGER", "BIGINT"})

_FORBIDDEN = re.compile(
    r"\b(GRANT|REVOKE|LOAD\s+DATA|OUTFILE|DUMPFILE|INFILE|LOAD_FILE|"
    r"SHUTDOWN|KILL\s+|SOURCE\s+|\.sys|mysql\.user|pg_read_file)\b",
    re.IGNORECASE,
)
_SELECTISH = re.compile(r"^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b", re.IGNORECASE)


def assert_management_sql(sql: str) -> str:
    cleaned = sql.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="sql is empty")
    body = cleaned.rstrip(";").strip()
    if ";" in body:
        raise HTTPException(status_code=400, detail="only a single statement is allowed")
    if _FORBIDDEN.search(body):
        raise HTTPException(status_code=400, detail="statement is not allowed from the panel")
    return body


def _validate_ident(name: str, *, label: str = "name") -> str:
    cleaned = name.strip()
    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]{0,63}$", cleaned):
        raise HTTPException(
            status_code=400,
            detail=f"{label} must start with a letter and use letters, digits, or underscore",
        )
    return cleaned


def _validate_column_type(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned or len(cleaned) > 64:
        raise HTTPException(status_code=400, detail="column type is invalid or too long")
    if not _COLUMN_TYPE.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail="column type must look like INT, VARCHAR(255), or DECIMAL(10,2)",
        )
    return cleaned.upper() if cleaned.isalpha() else cleaned


def _base_type(ctype: str) -> str:
    return ctype.split("(", 1)[0].strip().upper()


def _prepare_create_columns(
    plugin_id: str,
    columns: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not columns:
        raise HTTPException(status_code=400, detail="at least one column is required")
    safe: list[dict[str, Any]] = []
    for col in columns:
        name = _validate_ident(str(col.get("name") or ""), label="column name")
        ctype = _validate_column_type(str(col.get("type") or "VARCHAR(255)"))
        primary = bool(col.get("primary"))
        auto_inc = bool(col.get("auto_increment"))
        if auto_inc and plugin_id == "mysql":
            if _base_type(ctype) not in _INTEGER_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"AUTO_INCREMENT requires an integer type on column {name} (e.g. BIGINT)"
                    ),
                )
        if auto_inc and plugin_id == "postgresql":
            auto_inc = False
        safe.append(
            {
                "name": name,
                "type": ctype,
                "nullable": bool(col.get("nullable", True)),
                "primary": primary,
                "auto_increment": auto_inc,
                "default": col.get("default"),
            }
        )
    if not any(c["primary"] for c in safe):
        safe[0]["primary"] = True
    return safe


def sql_complete(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    prefix: str,
    table_name: str | None = None,
) -> dict[str, Any]:
    extra: list[str] = []
    if table_name:
        driver = get_driver(plugin.id)
        if driver and hasattr(driver, "list_columns"):
            ctx = runtime_context(plugin, record)
            cols = driver.list_columns(ctx, db_name=db_name, table_name=table_name)  # type: ignore
            extra = [str(c.get("name") or "") for c in cols if c.get("name")]
    return complete_prefix(plugin.id, prefix, extra=extra)


def list_table_columns(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    table_name: str,
) -> list[dict[str, Any]]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "list_columns"):
        raise HTTPException(status_code=400, detail="column listing not supported for this engine")
    db = validate_db_name(db_name)
    table = _validate_ident(table_name, label="table name")
    try:
        ctx = runtime_context(plugin, record)
        return driver.list_columns(ctx, db_name=db, table_name=table)  # type: ignore[attr-defined]
    except HTTPException as exc:
        reraise_as_client_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)[:500]) from exc


def run_management_sql(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    sql: str,
    limit: int,
) -> dict[str, Any]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "execute_sql"):
        return {"ok": False, "error": "sql execution not supported", "message": "not supported"}
    name = validate_db_name(db_name)
    try:
        statement = assert_management_sql(sql)
    except HTTPException as exc:
        detail = str(exc.detail)
        return {"ok": False, "error": detail, "message": detail, "sql_executed": None}
    try:
        ctx = runtime_context(plugin, record)
        if _SELECTISH.match(statement) and not re.search(r"\bLIMIT\b", statement, re.IGNORECASE):
            statement = f"{statement} LIMIT {int(limit)}"
        result = driver.execute_sql(ctx, db_name=name, sql=statement)  # type: ignore[attr-defined]
        rows = result.get("rows") or []
        affected = result.get("rows_affected")
        msg = result.get("message") or (
            f"OK · {len(rows)} row(s)" if rows else f"OK · {affected or 0} row(s) affected"
        )
        return {
            "ok": True,
            "error": None,
            "columns": result.get("columns") or [],
            "rows": rows,
            "row_count": len(rows),
            "rows_affected": affected,
            "elapsed_ms": result.get("elapsed_ms"),
            "message": msg,
            "sql_executed": statement,
        }
    except HTTPException as exc:
        detail = str(exc.detail)
        return {
            "ok": False,
            "error": detail,
            "message": detail,
            "sql_executed": statement,
            "columns": [],
            "rows": [],
            "row_count": 0,
        }
    except Exception as exc:
        detail = str(exc)[:500]
        return {
            "ok": False,
            "error": detail,
            "message": detail,
            "sql_executed": statement,
            "columns": [],
            "rows": [],
            "row_count": 0,
        }


def create_table(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    table_name: str,
    columns: list[dict[str, Any]],
) -> dict[str, Any]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "create_table"):
        raise HTTPException(status_code=400, detail="create table not supported for this engine")
    db = validate_db_name(db_name)
    table = _validate_ident(table_name, label="table name")
    safe_columns = _prepare_create_columns(plugin.id, columns)
    try:
        ctx = runtime_context(plugin, record)
        driver.create_table(ctx, db_name=db, table_name=table, columns=safe_columns)  # type: ignore
    except HTTPException as exc:
        reraise_as_client_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)[:500]) from exc
    return {"ok": True, "table": table, "message": f"Created table {table}"}


def add_column(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    table_name: str,
    column_name: str,
    column_type: str,
    nullable: bool = True,
    default: str | None = None,
) -> dict[str, Any]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "add_column"):
        raise HTTPException(status_code=400, detail="add column not supported for this engine")
    db = validate_db_name(db_name)
    table = _validate_ident(table_name, label="table name")
    col = _validate_ident(column_name, label="column name")
    ctype = _validate_column_type(column_type)
    try:
        ctx = runtime_context(plugin, record)
        driver.add_column(  # type: ignore
            ctx,
            db_name=db,
            table_name=table,
            column_name=col,
            column_type=ctype,
            nullable=nullable,
            default=default,
        )
    except HTTPException as exc:
        reraise_as_client_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)[:500]) from exc
    return {"ok": True, "message": f"Added column {col} to {table}"}


def insert_row(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    table_name: str,
    values: dict[str, Any],
) -> dict[str, Any]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "insert_row"):
        raise HTTPException(status_code=400, detail="insert row not supported for this engine")
    if not values:
        raise HTTPException(status_code=400, detail="values cannot be empty")
    db = validate_db_name(db_name)
    table = _validate_ident(table_name, label="table name")
    safe_values: dict[str, Any] = {}
    for key, val in values.items():
        safe_values[_validate_ident(str(key), label="column name")] = val
    try:
        ctx = runtime_context(plugin, record)
        driver.insert_row(ctx, db_name=db, table_name=table, values=safe_values)  # type: ignore
    except HTTPException as exc:
        reraise_as_client_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)[:500]) from exc
    return {"ok": True, "message": f"Inserted row into {table}"}
