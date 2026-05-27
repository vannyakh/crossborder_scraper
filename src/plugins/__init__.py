"""
Built-in source plugin packages (instagram, tiktok, linkedin, custom_plugin).

Registry and lifecycle: ``core.plugins``
Installed workspaces: ``installed_plugins/`` at repo root
"""

from core.plugins import (
    enabled_scraper_classes,
    get_installed_spec,
    get_plugin_manager,
    get_scraper_for_url,
    get_source_spec,
    list_source_catalog,
    list_source_specs,
    supported_source_labels,
)

__all__ = [
    "enabled_scraper_classes",
    "get_installed_spec",
    "get_plugin_manager",
    "get_scraper_for_url",
    "get_source_spec",
    "list_source_catalog",
    "list_source_specs",
    "supported_source_labels",
]
