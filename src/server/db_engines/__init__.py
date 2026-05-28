"""Panel database engine drivers — multi-platform logical DB management."""

from server.db_engines import catalog, platforms, registry
from server.db_engines.catalog import (
    generate_db_password,
    generate_db_username,
    list_databases_from_record,
    public_database_entry,
    resolve_managed_database,
    sync_managed_catalog_row,
    validate_db_name,
)
from server.db_engines.registry import (
    drop_database,
    get_driver,
    list_platform_ids,
    list_provider_catalog,
    provision_database,
    supports_multiple_databases,
)

__all__ = [
    "catalog",
    "platforms",
    "registry",
    "drop_database",
    "generate_db_password",
    "generate_db_username",
    "get_driver",
    "list_databases_from_record",
    "list_platform_ids",
    "list_provider_catalog",
    "provision_database",
    "public_database_entry",
    "resolve_managed_database",
    "supports_multiple_databases",
    "sync_managed_catalog_row",
    "validate_db_name",
]
