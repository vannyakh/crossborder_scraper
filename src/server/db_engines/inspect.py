"""Read-only database inspection — table catalog and test queries."""

from __future__ import annotations

import re
import time
from typing import Any

from fastapi import HTTPException

from server.app_store.catalog import StorePluginDefinition
from server.db_engines.catalog import validate_db_name
from server.db_engines.query_suggestions import build_query_suggestions, syntax_hints
from server.db_engines.registry import get_driver, runtime_context
from server.db_engines.sql_errors import reraise_as_client_error

_READ_ONLY_PREFIX = re.compile(r"^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b", re.IGNORECASE)
_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|REPLACE|"
    r"RENAME|LOAD|OUTFILE|INFILE|INTO|SET|USE|LOCK|UNLOCK)\b",
    re.IGNORECASE,
)


def assert_readonly_sql(sql: str) -> str:
    cleaned = sql.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="query is empty")
    body = cleaned.rstrip(";").strip()
    if ";" in body:
        raise HTTPException(status_code=400, detail="only a single statement is allowed")
    if not _READ_ONLY_PREFIX.match(body):
        raise HTTPException(
            status_code=400,
            detail="only SELECT, SHOW, DESCRIBE, or EXPLAIN statements are allowed",
        )
    if _FORBIDDEN.search(body):
        raise HTTPException(status_code=400, detail="statement contains forbidden keywords")
    return body


def _prepare_sql(sql: str, limit: int) -> str:
    statement = assert_readonly_sql(sql)
    if not re.search(r"\bLIMIT\b", statement, re.IGNORECASE):
        statement = f"{statement} LIMIT {int(limit)}"
    return statement


def list_logical_tables(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
) -> list[dict[str, Any]]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "list_tables"):
        raise HTTPException(
            status_code=400,
            detail=f"{plugin.name} does not support table inspection from the panel",
        )
    name = validate_db_name(db_name)
    try:
        ctx = runtime_context(plugin, record)
        return driver.list_tables(ctx, db_name=name)  # type: ignore[attr-defined]
    except HTTPException as exc:
        reraise_as_client_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)[:500]) from exc


def tables_payload(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
) -> dict[str, Any]:
    name = validate_db_name(db_name)
    items = list_logical_tables(plugin, record, db_name=name)
    return {
        "plugin_id": plugin.id,
        "database": name,
        "items": items,
        "total": len(items),
        "suggestions": build_query_suggestions(plugin.id, name),
        "syntax_hints": syntax_hints(plugin.id),
    }


def run_logical_query(
    plugin: StorePluginDefinition,
    record: dict[str, Any],
    *,
    db_name: str,
    sql: str,
    limit: int,
) -> dict[str, Any]:
    driver = get_driver(plugin.id)
    if not driver or not hasattr(driver, "run_read_query"):
        return {
            "ok": False,
            "error": f"{plugin.name} does not support test queries from the panel",
            "columns": [],
            "rows": [],
            "row_count": 0,
            "elapsed_ms": None,
            "message": f"{plugin.name} does not support test queries from the panel",
            "sql_executed": None,
        }
    name = validate_db_name(db_name)
    try:
        statement = _prepare_sql(sql, limit)
    except HTTPException as exc:
        detail = str(exc.detail)
        return {
            "ok": False,
            "error": detail,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "elapsed_ms": None,
            "message": detail,
            "sql_executed": None,
        }
    try:
        ctx = runtime_context(plugin, record)
        started = time.perf_counter()
        result = driver.run_read_query(ctx, db_name=name, sql=statement)  # type: ignore[attr-defined]
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        rows = result.get("rows") or []
        msg = f"OK · {len(rows)} row(s) in {elapsed_ms} ms"
        return {
            "ok": True,
            "error": None,
            "columns": result.get("columns") or [],
            "rows": rows,
            "row_count": len(rows),
            "elapsed_ms": elapsed_ms,
            "message": msg,
            "sql_executed": statement,
        }
    except HTTPException as exc:
        detail = str(exc.detail)
        return {
            "ok": False,
            "error": detail,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "elapsed_ms": None,
            "message": detail,
            "sql_executed": statement,
        }
    except Exception as exc:
        detail = str(exc)[:500]
        return {
            "ok": False,
            "error": detail,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "elapsed_ms": None,
            "message": detail,
            "sql_executed": statement,
        }
