"""Version probe maps apt output to catalog ids."""

from server.db_engines.platforms import official_product_label
from server.db_engines.platforms.mysql.probe import map_apt_to_catalog as map_mysql
from server.db_engines.platforms.postgresql.probe import map_apt_to_catalog as map_postgresql


def test_official_labels():
    assert official_product_label("mysql") == "MySQL"
    assert official_product_label("postgresql") == "PostgreSQL"


def test_map_mysql_versions_from_apt():
    found = map_mysql(
        ["8", "5.7"],
        ["8.0.36-0ubuntu0.22.04.1", "5.7.42-0ubuntu0.18.04.1"],
        ["mysql-server-8.0", "mysql-server-5.7"],
    )
    assert "8" in found
    assert "5.7" in found


def test_map_postgresql_versions_from_apt():
    found = map_postgresql(
        ["16", "15"],
        [],
        ["postgresql-16", "postgresql-15"],
    )
    assert "16" in found
    assert "15" in found
