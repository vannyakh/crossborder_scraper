"""Built-in plugin auto-discovery under src/plugins/."""

from __future__ import annotations

from core.plugins.discovery import (
    discover_builtin_packages,
    plugin_package_dir,
    reload_builtin_discovery,
    root_plugin_dirs,
)
from core.plugins.manager import get_plugin_manager


def test_discover_builtin_packages_includes_all_builtins() -> None:
    reload_builtin_discovery()
    ids = {spec.id for spec in discover_builtin_packages()}
    assert ids >= {
        "1688",
        "taobao",
        "aliexpress",
        "instagram",
        "tiktok",
        "linkedin",
        "custom_plugin",
    }
    assert "_template" not in {path.name for path in root_plugin_dirs()}


def test_each_builtin_exports_manifest_scraper_and_spec() -> None:
    reload_builtin_discovery()
    for spec in discover_builtin_packages():
        assert spec.manifest.id
        assert spec.manifest.name
        assert spec.scraper_cls is not None
        assert spec.manifest.scrape_spec is not None
        assert spec.flow_node is not None
        assert spec.flow_node.profile_id == f"scraper-{spec.id}"
        assert spec.flow_node.node_kind == "scrape"


def test_source_catalog_includes_flow_node() -> None:
    reload_builtin_discovery()
    mgr = get_plugin_manager()
    mgr.reload()
    row = next(item for item in mgr.list_source_catalog() if item.get("id") == "1688")
    assert row.get("flow_node", {}).get("profile_id") == "scraper-1688"


def test_plugin_package_dir_resolves_by_manifest_id() -> None:
    reload_builtin_discovery()
    path = plugin_package_dir("1688")
    assert path is not None
    assert path.name == "alibaba_1688"


def test_plugin_manager_loads_discovered_builtins() -> None:
    mgr = get_plugin_manager()
    mgr.reload()
    catalog_ids = {row["id"] for row in mgr.list_source_catalog()}
    assert "1688" in catalog_ids
    assert "taobao" in catalog_ids
