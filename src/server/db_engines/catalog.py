"""Install-record catalog — managed database resolution and config sync."""

from __future__ import annotations

import re
import secrets
from typing import Any

_NAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")


def generate_db_username() -> str:
    return f"u{secrets.token_hex(4)}"


def generate_db_password() -> str:
    return secrets.token_urlsafe(16)


def validate_db_name(name: str) -> str:
    from fastapi import HTTPException

    cleaned = name.strip()
    if not _NAME_RE.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail="database name must start with a letter and use letters, digits, or underscore",
        )
    return cleaned


def admin_config(record: dict[str, Any]) -> dict[str, Any]:
    return dict(record.get("config") or {})


def public_database_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(row.get("name") or ""),
        "username": str(row.get("username") or ""),
        "password": str(row.get("password") or ""),
        "charset": str(row.get("charset") or "utf8mb4"),
        "access": str(row.get("access") or "local"),
        "created_at": row.get("created_at"),
        "legacy": bool(row.get("legacy")),
    }


def list_databases_from_record(record: dict[str, Any]) -> list[dict[str, Any]]:
    config = admin_config(record)
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


def resolve_managed_database(record: dict[str, Any]) -> dict[str, Any] | None:
    """Primary panel-managed logical database for this install record."""
    config = admin_config(record)
    primary = str(config.get("database") or "").strip()
    items = list_databases_from_record(record)
    if primary:
        for row in items:
            if str(row.get("name")) == primary:
                return dict(row)
        return {
            "name": primary,
            "username": config.get("username"),
            "password": config.get("password"),
            "charset": "utf8mb4",
            "access": "local",
            "legacy": not items,
        }
    if len(items) == 1:
        return dict(items[0])
    return dict(items[0]) if items else None


def sync_managed_catalog_row(config: dict[str, Any]) -> dict[str, Any]:
    """Keep the managed row in config.databases aligned with connection fields."""
    primary = str(config.get("database") or "").strip()
    stored = config.get("databases")
    if not primary or not isinstance(stored, list):
        return config
    updated: list[dict[str, Any]] = []
    for row in stored:
        if not isinstance(row, dict):
            continue
        copy = dict(row)
        if str(copy.get("name")) == primary:
            if config.get("username") is not None:
                copy["username"] = config.get("username")
            if config.get("password") is not None:
                copy["password"] = config.get("password")
        updated.append(copy)
    config["databases"] = updated
    return config
