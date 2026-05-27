# Cross-Border
Scrape listings from **1688**, **Taobao**, and **AliExpress**, normalize product data, and export to **Shopee**, **Lazada**, **TikTok Shop**, or **Shopify**.

Python **3.12+** backend (Playwright, FastAPI, Pydantic) with a React control panel for jobs, inventory, AI agent workflows, and marketplace settings.

## Features

- **Concurrent scrape engine** — asyncio workers, browser pool, proxy rotation, multi-account cookies
- **AI extraction fallback** — when site layouts break CSS selectors
- **Web panel** — submit jobs, browse products, export, theme/branding, agent chat + cron schedules
- **Gateway agent** — CLI and API tools over the same HTTP surface
- **Extensible sources** — built-in plugins + sandboxed ZIP installs
- **Self-host** — Docker, one-line installer, optional Telegram control

## Quick start

```bash
uv sync
uv run playwright install chromium
cp .env.example .env && cp config/ui_config.example.json config/ui_config.json
crossborder setup
uv run serve
```


Full walkthrough: **[docs/QUICK_START.md](docs/QUICK_START.md)**

## Documentation

| Topic | Guide |
|-------|--------|
| Install & first scrape | [docs/QUICK_START.md](docs/QUICK_START.md) |
| CLI commands | [docs/CLI.md](docs/CLI.md) |
| Engine, proxies, AI | [docs/SCRAPING.md](docs/SCRAPING.md) |
| HTTP API | [docs/API.md](docs/API.md) |
| Dev UI + API | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| VPS / Docker deploy | [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) |
| **All docs** | **[docs/README.md](docs/README.md)** |

Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · Releases: [.github/RELEASE.md](.github/RELEASE.md)

## Repo layout (short)

```
apps/web/          React panel (Vite)
src/               Python: cli, core, plugins, export, gateway, server
config/            Runtime JSON/YAML (ui_config, plugins, proxies)
data/              Cookies, SQLite, scrape output (gitignored)
docs/              Guides (detailed setup lives here, not in this README)
```

Full map: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## License

Use responsibly. Respect each marketplace and source site's terms of service and robots rules; prefer official APIs for publishing listings.
