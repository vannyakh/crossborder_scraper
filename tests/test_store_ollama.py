"""App Store catalog tests."""

from __future__ import annotations

from deploy.drivers.registry import get_driver_spec
from server.app_store.catalog import get_plugin, list_catalog


def test_ollama_store_catalog_entry():
    plugin = get_plugin("ollama")
    assert plugin is not None
    assert plugin.category == "ai"
    assert plugin.default_port == 11434
    assert plugin.supports_docker is True
    assert plugin.supports_external is True

    row = plugin.to_catalog_dict()
    assert row["supports_native"] is True
    assert row["default_version"] == "latest"

    spec = get_driver_spec("ollama")
    assert spec is not None
    assert spec.systemd_unit == "ollama"


def test_store_catalog_includes_ollama():
    ids = {item["id"] for item in list_catalog()}
    assert "ollama" in ids
