"""Database engine driver registry."""

from server.db_engines.registry import get_driver, list_platform_ids, supports_multiple_databases


def test_registry_lists_sql_platforms():
    assert set(list_platform_ids()) == {"mysql", "mongodb", "postgresql"}


def test_mysql_driver_registered():
    driver = get_driver("mysql")
    assert driver is not None
    assert driver.platform_id == "mysql"
    assert supports_multiple_databases("mysql")
    assert not supports_multiple_databases("redis")
