"""
Source / scrape plugin framework (built-in + sandboxed ZIP installs).

Submodules:
  ``spec`` — e-commerce scrape specification model
  ``base`` — manifests and social scraper bases
  ``security`` — ZIP validation, AST scan, permissions
  ``sandbox`` — untrusted plugin loader + adapter
  ``manager`` — registry, catalog, URL routing
  ``discovery`` — auto-load built-in packages under ``src/plugins/``
  ``installer`` — ZIP install / uninstall
"""

from core.plugins.base import (
    CustomDomainScraper,
    PluginKind,
    SocialPageScraper,
    SourcePluginManifest,
    SourcePluginSpec,
)
from core.plugins.builtin_specs import PLUGIN_SPECS, SITE_SPECS
from core.plugins.capabilities import (
    CUSTOM_TEMPLATE,
    ECOMMERCE_RETAIL,
    ECOMMERCE_WHOLESALE,
    SOCIAL_CONTENT,
)
from core.plugins.discovery import (
    discover_builtin_packages,
    plugin_package_dir,
    reload_builtin_discovery,
    root_plugin_dirs,
)
from core.plugins.flow_node import FlowNodeSpec, resolve_flow_node
from core.plugins.installer import PluginInstaller, get_plugin_installer
from core.plugins.manager import (
    InstalledPluginSpec,
    PluginManager,
    enabled_scraper_classes,
    get_installed_spec,
    get_plugin_manager,
    get_scraper_by_site,
    get_scraper_for_url,
    get_source_spec,
    is_source_plugin_enabled,
    list_source_catalog,
    list_source_specs,
    require_scraper_for_url,
    source_plugin_domains,
    source_plugin_settings,
    supported_source_labels,
)
from core.plugins.sandbox import SandboxedPluginLoader, SandboxedScraperAdapter
from core.plugins.security import (
    InstalledPluginManifest,
    PluginPermissions,
    PluginSecurityError,
    SecurityPolicy,
    extract_zip_safely,
    load_manifest_file,
    validate_plugin_workspace,
    validate_python_source,
)
from core.plugins.spec import (
    STANDARD_DATA_FIELDS,
    EcommerceScrapeSpec,
    ScrapeCapabilities,
    ScrapeCategory,
    parse_scrape_spec,
)

__all__ = [
    "PLUGIN_SPECS",
    "SITE_SPECS",
    "STANDARD_DATA_FIELDS",
    "CUSTOM_TEMPLATE",
    "ECOMMERCE_RETAIL",
    "ECOMMERCE_WHOLESALE",
    "SOCIAL_CONTENT",
    "discover_builtin_packages",
    "plugin_package_dir",
    "reload_builtin_discovery",
    "root_plugin_dirs",
    "FlowNodeSpec",
    "resolve_flow_node",
    "CustomDomainScraper",
    "EcommerceScrapeSpec",
    "InstalledPluginManifest",
    "InstalledPluginSpec",
    "PluginInstaller",
    "PluginKind",
    "PluginManager",
    "PluginPermissions",
    "PluginSecurityError",
    "SandboxedPluginLoader",
    "SandboxedScraperAdapter",
    "ScrapeCapabilities",
    "ScrapeCategory",
    "SecurityPolicy",
    "SocialPageScraper",
    "SourcePluginManifest",
    "SourcePluginSpec",
    "enabled_scraper_classes",
    "extract_zip_safely",
    "get_installed_spec",
    "get_plugin_installer",
    "get_plugin_manager",
    "get_scraper_by_site",
    "get_scraper_for_url",
    "get_source_spec",
    "require_scraper_for_url",
    "is_source_plugin_enabled",
    "list_source_catalog",
    "list_source_specs",
    "load_manifest_file",
    "parse_scrape_spec",
    "source_plugin_domains",
    "source_plugin_settings",
    "supported_source_labels",
    "validate_plugin_workspace",
    "validate_python_source",
]
