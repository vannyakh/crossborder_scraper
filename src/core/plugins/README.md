# Plugin core (`core.plugins`)

Scrape **source plugins**: built-ins under `src/plugins/`, ZIP installs under `installed_plugins/`.

| Module | Role |
|--------|------|
| `spec.py` | `EcommerceScrapeSpec`, capabilities, standard data fields |
| `builtin_specs.py` | Predefined specs for sites + social plugins |
| `base.py` | `SourcePluginManifest`, `SocialPageScraper`, `CustomDomainScraper` |
| `security.py` | Manifest validation, ZIP extract, AST policy |
| `sandbox.py` | Load untrusted `plugin.py`, domain allowlist, timeout |
| `manager.py` | `PluginManager`, catalog, enable/disable, URL → scraper |
| `installer.py` | `POST` ZIP install / uninstall API backing |

Import from the package root:

```python
from core.plugins import get_plugin_manager, PLUGIN_SPECS, PluginSecurityError
```
