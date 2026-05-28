"""Suggested read-only SQL snippets for panel database tools."""

from __future__ import annotations


def _quote_ident(plugin_id: str, name: str) -> str:
    if plugin_id == "postgresql":
        return f'"{name}"'
    return f"`{name}`"


def build_query_suggestions(
    plugin_id: str,
    database_name: str,
    *,
    table_name: str | None = None,
) -> list[dict[str, str]]:
    pid = plugin_id.strip().lower()
    db = database_name.strip()
    out: list[dict[str, str]] = []

    if pid == "mysql":
        out.extend(
            [
                {"label": "Show tables", "sql": "SHOW TABLES"},
                {"label": "Show status", "sql": "SHOW TABLE STATUS"},
                {"label": "Server version", "sql": "SELECT VERSION()"},
            ]
        )
        if table_name:
            t = _quote_ident(pid, table_name)
            out.insert(
                0,
                {"label": f"Preview {table_name}", "sql": f"SELECT * FROM {t} LIMIT 20"},
            )
            out.append({"label": f"Describe {table_name}", "sql": f"DESCRIBE {t}"})
            out.append({"label": f"Count {table_name}", "sql": f"SELECT COUNT(*) FROM {t}"})
        else:
            out.insert(
                0, {"label": "Tables in schema", "sql": f"SHOW TABLES FROM {_quote_ident(pid, db)}"}
            )
    elif pid == "postgresql":
        out.extend(
            [
                {
                    "label": "Public tables",
                    "sql": "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1",
                },
                {"label": "Server version", "sql": "SELECT version()"},
            ]
        )
        if table_name:
            t = _quote_ident(pid, table_name)
            out.insert(
                0,
                {"label": f"Preview {table_name}", "sql": f"SELECT * FROM {t} LIMIT 20"},
            )
            out.append(
                {
                    "label": f"Columns in {table_name}",
                    "sql": (
                        "SELECT column_name, data_type FROM information_schema.columns "
                        f"WHERE table_schema = 'public' AND table_name = '{table_name}' "
                        "ORDER BY ordinal_position"
                    ),
                }
            )
            out.append({"label": f"Count {table_name}", "sql": f"SELECT COUNT(*) FROM {t}"})
    return out


def syntax_hints(plugin_id: str) -> list[str]:
    pid = plugin_id.strip().lower()
    if pid == "mysql":
        return [
            "SELECT col FROM `table` WHERE id = 1 LIMIT 100",
            "SHOW TABLES",
            "DESCRIBE `table`",
            "EXPLAIN SELECT * FROM `table` LIMIT 10",
        ]
    if pid == "postgresql":
        return [
            'SELECT col FROM "table" WHERE id = 1 LIMIT 100',
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
            'EXPLAIN SELECT * FROM "table" LIMIT 10',
        ]
    return ["Only SELECT, SHOW, DESCRIBE, and EXPLAIN are allowed (read-only)."]
