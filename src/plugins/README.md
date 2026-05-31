# Source plugins (`src/plugins/`)

Built-in **execution plugins** for the project flow canvas. Each package is both a runtime scraper and a **configured flow node** in the panel.

## Role in project flow

Source plugins are the core of scrape **action nodes** on the flow canvas:

```
Project flow canvas
  scrape node (kind: scrape)
    ├── pluginId        → MANIFEST.id  (e.g. "1688")
    ├── pluginProfile   → FLOW_NODE.profile_id  (e.g. "scraper-1688")
    └── options         → FLOW_NODE.default_options + operator overrides
          (plugin_id, source_url, batch_mode, ai_extraction, …)
```

The panel loads node config from `/projects/plugin-profiles/catalog`, which is **derived from each plugin's manifest + FLOW_NODE**. When you add a plugin package, its profile appears automatically in the scrape node config drawer.

## Package layout

```
src/plugins/my_shop/
  __init__.py    # exports MANIFEST, SCRAPE_SPEC, FLOW_NODE, SCRAPER
  manifest.py    # catalog metadata + scrape spec + flow node binding
  scraper.py     # BaseScraper implementation (runtime execution)
  README.md      # optional operator guide
```

Copy `src/plugins/_template/` when adding a new built-in plugin.

## Required exports (`__init__.py`)

| Export | Type | Purpose |
|--------|------|---------|
| `MANIFEST` | `SourcePluginManifest` | App Store row + URL routing |
| `SCRAPE_SPEC` | `EcommerceScrapeSpec` | Data fields, capabilities, spec tab |
| `FLOW_NODE` | `FlowNodeSpec` | **Project flow node** profile + default options |
| `SCRAPER` | `BaseScraper` subclass | Runtime scrape when the flow runs |

`FLOW_NODE` is auto-derived from `SCRAPE_SPEC` if omitted, but explicit export is recommended:

```python
FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="my_shop", scrape_spec=SCRAPE_SPEC)
```

Use `FLOW_NODE.seed_node(...)` when building community templates or tests.

## Panel integration

| Surface | How the plugin appears |
|---------|------------------------|
| **Flow canvas** | Scrape node → **Source plugin** select (`pluginProfile: scraper-{id}`) |
| **Node config** | `/projects/plugin-profiles/catalog` — fields from `FLOW_NODE.default_options` |
| **App Store** | `/store/catalog` via `list_source_catalog()` + `flow_node` metadata |
| **Community templates** | `libs/project_templates/*.json` nodes reference `pluginId` + `pluginProfile` |
| **Gateway agent** | URL routing via `get_scraper_for_url()` when enabled in `config/plugins.yaml` |

## Enable / configure

Edit `config/plugins.yaml`:

```yaml
source_plugins:
  my_shop:
    enabled: true
    extra_domains:
      - shop.example.com
```

## Registry code

| Module | Role |
|--------|------|
| `core.plugins.flow_node` | `FlowNodeSpec` — canvas node binding |
| `core.plugins.discovery` | Auto-load packages under `src/plugins/` |
| `core.plugins.manager` | Catalog (+ `flow_node`), enable state, URL routing |
| `server.projects.plugin_profiles` | Manifest → node config profiles for the canvas |

## Sandboxed ZIP plugins

Third-party plugins install to `installed_plugins/` with `manifest.json` + `plugin.py`. See `config/plugin_manifest.example.json`.
