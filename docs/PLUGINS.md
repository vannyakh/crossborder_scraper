# Source plugins

Built-in plugins live under `src/plugins/`. Installed ZIP plugins go in `installed_plugins/`.

## Add a new source

1. Create `src/plugins/my_site/plugin.py` extending `BaseScraper` with a `SourcePluginManifest`.
2. Implement `extract_product_id`, `parse_html`, and CSS selectors.
3. Register in `core/plugins/manager.py` and enable in `config/plugins.yaml`.

See [core/plugins/README.md](../src/core/plugins/README.md) for the plugin framework.
