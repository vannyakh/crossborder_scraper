"""Per-engine platform submodules (MySQL, PostgreSQL, MongoDB, Redis, SQLite)."""

from __future__ import annotations

from types import ModuleType
from typing import TYPE_CHECKING

from server.db_engines.platforms import mongodb, mysql, postgresql, redis, sqlite
from server.db_engines.platforms._meta import PlatformMeta
from server.db_engines.platforms.mongodb import MongoDBDriver
from server.db_engines.platforms.mysql import MySQLDriver
from server.db_engines.platforms.postgresql import PostgreSQLDriver

if TYPE_CHECKING:
    from server.db_engines.base import DatabasePlatformDriver

ALL_PLATFORM_IDS: tuple[str, ...] = ("mysql", "postgresql", "mongodb", "redis", "sqlite")

_PLATFORM_META: dict[str, PlatformMeta] = {
    "mysql": mysql.META,
    "postgresql": postgresql.META,
    "mongodb": mongodb.META,
    "redis": redis.META,
    "sqlite": sqlite.META,
}

_LOGICAL_DRIVERS: dict[str, DatabasePlatformDriver] = {
    "mysql": MySQLDriver(),
    "postgresql": PostgreSQLDriver(),
    "mongodb": MongoDBDriver(),
}

_PROBE_MODULES: dict[str, ModuleType] = {
    "mysql": mysql.probe_module,
    "postgresql": postgresql.probe_module,
    "mongodb": mongodb.probe_module,
    "redis": redis.probe_module,
}


def official_product_label(platform_id: str) -> str:
    meta = _PLATFORM_META.get(platform_id)
    return meta.product_label if meta else platform_id


def get_platform_meta(platform_id: str) -> PlatformMeta | None:
    return _PLATFORM_META.get(platform_id)


def get_logical_driver(platform_id: str) -> DatabasePlatformDriver | None:
    return _LOGICAL_DRIVERS.get(platform_id)


def get_probe_module(platform_id: str) -> ModuleType | None:
    return _PROBE_MODULES.get(platform_id)


def list_logical_platform_ids() -> list[str]:
    return sorted(_LOGICAL_DRIVERS.keys())
