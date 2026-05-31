# Plugin core (`core.plugins`)

Scrape **source plugins**: built-ins under `src/plugins/`, ZIP installs under `installed_plugins/`.

| Module | Role |
|--------|------|
| `spec.py` | `EcommerceScrapeSpec`, capabilities, standard data fields |
| `flow_node.py` | `FlowNodeSpec` — project canvas node binding |
| `capabilities.py` | Shared `ScrapeCapabilities` presets |
| `discovery.py` | Auto-load built-in packages from `src/plugins/<package>/` |
| `builtin_specs.py` | `PLUGIN_SPECS` aggregated from discovery |
| `base.py` | `SourcePluginManifest`, `SocialPageScraper`, `CustomDomainScraper` |
| `security.py` | Manifest validation, ZIP extract, AST policy |
| `sandbox.py` | Load untrusted `plugin.py`, domain allowlist, timeout |
| `manager.py` | `PluginManager`, catalog, enable/disable, URL → scraper |
| `installer.py` | ZIP install / uninstall API backing |

## Built-in discovery

Each package under `src/plugins/<name>/` must export `MANIFEST`, `SCRAPE_SPEC`, and `SCRAPER` from `__init__.py`. Packages whose names start with `_` (e.g. `_template`) are skipped.

```python
from core.plugins import discover_builtin_packages, get_plugin_manager

for spec in discover_builtin_packages():
    print(spec.id, spec.manifest.name)
```

After adding a folder, restart the API — no registry edit required.

Import from the package root:

```python
from core.plugins import get_plugin_manager, PLUGIN_SPECS, PluginSecurityError
```

See `src/plugins/README.md` for the full add-a-plugin workflow.
