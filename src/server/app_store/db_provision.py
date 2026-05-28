"""Backward-compatible facade — implementation lives in server.db_engines."""

from server.db_engines import (
    drop_database,
    generate_db_password,
    generate_db_username,
    list_databases_from_record,
    provision_database,
    public_database_entry,
    resolve_managed_database,
    supports_multiple_databases,
    sync_managed_catalog_row,
    validate_db_name,
)

__all__ = [
    "drop_database",
    "generate_db_password",
    "generate_db_username",
    "list_databases_from_record",
    "provision_database",
    "public_database_entry",
    "resolve_managed_database",
    "supports_multiple_databases",
    "sync_managed_catalog_row",
    "validate_db_name",
]
