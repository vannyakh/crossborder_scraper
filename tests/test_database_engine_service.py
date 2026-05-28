"""Managed database resolution and panel view."""

from __future__ import annotations

from server.db_engines import catalog


def test_resolve_managed_database_prefers_config_database():
    record = {
        "config": {
            "database": "panel",
            "username": "panel",
            "password": "secret",
            "databases": [
                {"name": "panel", "username": "panel", "password": "secret"},
                {"name": "test", "username": "u_test", "password": "other"},
            ],
        }
    }
    managed = catalog.resolve_managed_database(record)
    assert managed is not None
    assert managed["name"] == "panel"
    assert managed["username"] == "panel"


def test_sync_managed_catalog_row_updates_primary_entry():
    config = {
        "database": "panel",
        "username": "newuser",
        "password": "newpass",
        "databases": [
            {"name": "panel", "username": "old", "password": "old"},
            {"name": "test", "username": "u2", "password": "p2"},
        ],
    }
    synced = catalog.sync_managed_catalog_row(config)
    primary = next(row for row in synced["databases"] if row["name"] == "panel")
    assert primary["username"] == "newuser"
    assert primary["password"] == "newpass"
    other = next(row for row in synced["databases"] if row["name"] == "test")
    assert other["username"] == "u2"
