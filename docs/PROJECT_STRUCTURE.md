# Project structure

Monorepo layout for the cross-border scraper: Python backend under `src/`, React panel under `apps/web/`, runtime files at the repo root.

```
crossborder_scraper/
├── apps/
│   └── web/                 # React + Vite panel (was `public/`)
│       ├── src/               # UI pages, components, hooks
│       ├── public/            # Static assets (favicon, logos)
│       ├── dist/              # Production build → served at /ui/
│       └── package.json
│
├── src/                       # Python packages (flat imports: `from server import …`)
│   ├── cli/                   # Typer CLI (`scraper` command)
│   ├── config/                # Settings, credentials, ui_config I/O
│   ├── core/                  # Engine, AI, models, paths
│   │   └── plugins/           # Source plugin framework (spec, sandbox, manager)
│   ├── sites/                 # 1688, Taobao, AliExpress scrapers
│   ├── plugins/               # Built-in source plugins (social, custom)
│   ├── pipeline/              # Normalize + SQLite product store
│   ├── export/                # Shopee, Lazada, TikTok Shop, Shopify
│   ├── gateway/               # Agent tools, workflows, scheduler
│   └── server/                # FastAPI app
│       ├── routers/           # HTTP + WebSocket routes
│       ├── services/          # Business logic
│       ├── store/             # Plugin **marketplace** (Docker services catalog)
│       ├── stores/            # Service **audit logs** (not the marketplace)
│       ├── core/              # Events, constants, panel bind
│       └── infra/             # SPA static file serving
│
├── config/                    # Runtime YAML/JSON (not `src/config/`)
│   ├── plugins.yaml
│   ├── sites.yaml
│   ├── ui_config.json
│   └── proxies.txt
│
├── data/                      # Cookies, scrape output, SQLite (gitignored)
├── installed_plugins/         # ZIP-installed sandboxed plugins
├── libs/prompts/              # Gateway agent markdown prompts
│
├── main.py                    # CLI entry (`python main.py` → cli)
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

## Naming map (avoid confusion)

| Name | What it is |
|------|------------|
| `config/` (root) | Files on disk: plugins.yaml, ui_config.json |
| `src/config/` | Python package: `Settings`, `.env` loading |
| `server/store/` | Plugin marketplace API + Docker install |
| `pipeline/storage.py` | Product SQLite (`ProductStore`) |
| `data/store/` | Legacy panel metadata (migrated to `installed_plugins/`) |
| App Store UI “Store” | Frontend page for plugin marketplace |

## Path resolution

Use `core.plugins` for scrape/source plugins and `core.paths` instead of `Path(__file__).parents[2]`:

```python
from core.plugins import get_plugin_manager, PLUGIN_SPECS
from core.paths import repo_root, ui_dist_dir, config_dir, data_dir
```

Run CLI and API from the **repository root** so relative `config/` and `data/` paths resolve correctly.

## Entry points

| Command | Module |
|---------|--------|
| `uv run scraper` | `cli:app` |
| `uv run serve` | `server.__main__:main` |
| `python main.py` | Same as `scraper` |
| Docker | `uvicorn server.app:app` |

## Frontend dev

```bash
cd apps/web
pnpm install
pnpm dev
```

API serves built UI from `apps/web/dist` at `http://localhost:8000/ui/`.
