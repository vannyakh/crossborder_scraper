"""SQL / T-SQL keyword catalog for panel autocomplete."""

from __future__ import annotations

_KEYWORDS_COMMON = [
    "SELECT",
    "FROM",
    "WHERE",
    "INSERT",
    "INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE",
    "CREATE",
    "TABLE",
    "ALTER",
    "DROP",
    "ADD",
    "COLUMN",
    "INDEX",
    "PRIMARY",
    "KEY",
    "FOREIGN",
    "REFERENCES",
    "NOT",
    "NULL",
    "DEFAULT",
    "UNIQUE",
    "AUTO_INCREMENT",
    "LIMIT",
    "ORDER",
    "BY",
    "GROUP",
    "HAVING",
    "JOIN",
    "LEFT",
    "RIGHT",
    "INNER",
    "OUTER",
    "ON",
    "AS",
    "AND",
    "OR",
    "IN",
    "LIKE",
    "BETWEEN",
    "IS",
    "EXISTS",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "DISTINCT",
    "SHOW",
    "DESCRIBE",
    "DESC",
    "EXPLAIN",
    "TRUNCATE",
    "IF",
    "ELSE",
    "CASE",
    "WHEN",
    "THEN",
    "END",
]

_MYSQL_TYPES = [
    "INT",
    "INTEGER",
    "BIGINT",
    "SMALLINT",
    "TINYINT",
    "MEDIUMINT",
    "VARCHAR",
    "CHAR",
    "TEXT",
    "LONGTEXT",
    "MEDIUMTEXT",
    "BLOB",
    "DATETIME",
    "DATE",
    "TIME",
    "TIMESTAMP",
    "DECIMAL",
    "FLOAT",
    "DOUBLE",
    "BOOLEAN",
    "JSON",
    "ENUM",
]

_PG_TYPES = [
    "SERIAL",
    "SERIAL2",
    "SERIAL4",
    "SERIAL8",
    "SMALLSERIAL",
    "BIGSERIAL",
    "INTEGER",
    "INT",
    "BIGINT",
    "SMALLINT",
    "TEXT",
    "VARCHAR",
    "CHAR",
    "BOOLEAN",
    "BOOL",
    "UUID",
    "JSON",
    "JSONB",
    "TIMESTAMP",
    "TIMESTAMPTZ",
    "DATE",
    "NUMERIC",
    "DECIMAL",
    "REAL",
    "DOUBLE",
    "PRECISION",
]


def all_keywords(plugin_id: str) -> list[str]:
    pid = plugin_id.strip().lower()
    types = _PG_TYPES if pid == "postgresql" else _MYSQL_TYPES
    return sorted(set(_KEYWORDS_COMMON + types), key=str.lower)


def complete_prefix(
    plugin_id: str, prefix: str, *, extra: list[str] | None = None
) -> dict[str, list[str]]:
    p = prefix.strip().upper()
    pool = all_keywords(plugin_id)
    if extra:
        pool = sorted(set(pool + [x.upper() for x in extra]), key=str.lower)
    keywords = [k for k in pool if not p or k.startswith(p)]
    types = _PG_TYPES if plugin_id == "postgresql" else _MYSQL_TYPES
    type_hits = [t for t in types if not p or t.startswith(p)]
    return {
        "keywords": keywords[:40],
        "types": type_hits[:20],
        "identifiers": [x for x in (extra or []) if not p or x.upper().startswith(p)][:30],
    }
