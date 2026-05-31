"""Built-in scrape source specifications — aggregated from ``src/plugins/*/manifest.py``."""

from __future__ import annotations

from core.plugins.discovery import discover_builtin_packages
from core.plugins.spec import EcommerceScrapeSpec


def _collect_plugin_specs() -> dict[str, EcommerceScrapeSpec]:
    rows: dict[str, EcommerceScrapeSpec] = {}
    for spec in discover_builtin_packages():
        scrape_spec = spec.manifest.scrape_spec
        if scrape_spec is not None:
            rows[spec.id] = scrape_spec
    return rows


PLUGIN_SPECS: dict[str, EcommerceScrapeSpec] = _collect_plugin_specs()

# Backward-compatible alias (legacy "sites" catalog)
SITE_SPECS = {k: PLUGIN_SPECS[k] for k in ("1688", "taobao", "aliexpress") if k in PLUGIN_SPECS}
