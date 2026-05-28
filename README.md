# Cross-Border

**Self-hosted AI agent hub** — run a gateway agent from the web panel, CLI, or chat apps; automate work with skills, cron schedules, and plugins. Built-in **scrape and catalog analysis** for cross-border e-commerce (1688, Taobao, AliExpress → Shopee, Lazada, TikTok Shop, Shopify).

Python **3.12+** (FastAPI, Playwright) + React **agent panel** (`/ui/`). One gateway orchestrates everything — scrape engine, marketplace export, integrate channels, and VPS operations.

## Objective

Cross-Border is an **operator control plane**, not a single-purpose scraper:

| Layer | What it does |
|-------|----------------|
| **Gateway agent** | LLM + tools + skills — chat, cron jobs, workflows |
| **Agent panel** | Configure LLM, skills, schedules, health, firewall, App Store |
| **Integrate** | Same agent over **Telegram**, Discord, Slack, Email |
| **Scrape & data** | Concurrent engine, AI extraction, catalog monitor, batch jobs, export |
| **Hub & registry** | Built-in + installable **skills** (`SKILL.md`), **source plugins** (ZIP), App Store drivers |
| **Self-host** | Local dev, Docker, VPS one-liner — your machine or your server |

## Features

- **AI agent** — tool-calling LLM with grounded rules, prompts, and composable skills
- **Skills** — scrape, batch, catalog, export, panel ops, agent control (`skills/`)
- **Integrate channels** — control the agent from Telegram (live) and other messaging apps
- **Cron schedules** — recurring agent tasks with optional Telegram alerts
- **Scrape engine** — asyncio workers, browser pool, proxy rotation, plugin sources
- **Catalog & export** — SQLite store, marketplace dry-run/publish, AI enrichment fallback
- **Panel operations** — network access, host firewall, health probes, audit logs
- **Extensible** — plugin ZIP installs, skill registry install, store drivers on VPS

## Quick start

```bash
uv sync
uv run playwright install chromium
cp .env.example .env && cp config/ui_config.example.json config/ui_config.json
crossborder setup
uv run serve
```

Open **http://127.0.0.1:8787/ui/** → **Agent → Chat** or **Integrate → Telegram**.

Full walkthrough: **[docs/QUICK_START.md](docs/QUICK_START.md)**

## Documentation

| Topic | Guide |
|-------|--------|
| Install & first run | [docs/QUICK_START.md](docs/QUICK_START.md) |
| CLI | [docs/CLI.md](docs/CLI.md) |
| Gateway agent & Telegram | [docs/TELEGRAM.md](docs/TELEGRAM.md) |
| Scrape engine & AI | [docs/SCRAPING.md](docs/SCRAPING.md) |
| Plugins & skills | [docs/PLUGINS.md](docs/PLUGINS.md) · [skills/README.md](skills/README.md) |
| HTTP API | [docs/API.md](docs/API.md) |
| Local dev (UI + API) | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| VPS / Docker self-host | [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) |
| **All docs** | **[docs/README.md](docs/README.md)** |

Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

## For Cursor & coding agents

This repo is structured for **IDE agents** (Cursor) and **runtime agents** (panel gateway):

| Resource | Purpose |
|----------|---------|
| [AGENTS.md](AGENTS.md) | Repo map, vertical-slice checklist, where to add features |
| [.cursor/rules/](.cursor/rules/) | IDE rules — gateway, panel, Python, product language |
| [skills/](skills/) | Runtime `SKILL.md` packages the gateway agent loads |
| [libs/agent_rules/](libs/agent_rules/) | Runtime behavior rules injected into the panel agent |
| [libs/prompts/](libs/prompts/) | System prompts (`gateway_agent`, `telegram_agent`, …) |

**Gateway is the boundary** — new automation goes in `src/gateway/` (tools, workflows, integrate) and `src/server/services/`, not duplicated in the UI. See [AGENTS.md](AGENTS.md) before large changes.

## Repo layout

```
apps/web/          React agent panel (Vite, Chakra)
src/gateway/       Agent tools, skills, schedules, integrate runners
src/server/        FastAPI routers → services → schemas
src/core/          Scrape engine, plugins, AI extraction
src/deploy/        VPS install, firewall, store drivers
skills/            Built-in agent skills (SKILL.md)
libs/              Prompts, agent rules, guides, store scripts
config/            Runtime JSON/YAML (ui_config, agent_skills, plugins)
docs/              Detailed guides
```

Full map: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## License

Use responsibly. Respect each marketplace and source site's terms of service; prefer official APIs for publishing listings.
