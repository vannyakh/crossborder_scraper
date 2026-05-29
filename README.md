# Cross-Border

**Self-hosted AI agent hub** — run a gateway agent from the web panel, CLI, or chat apps; automate work with skills, cron schedules, and plugins. Built-in **scrape and catalog analysis** for cross-border e-commerce (1688, Taobao, AliExpress → Shopee, Lazada, TikTok Shop, Shopify).

Python **3.12+** (FastAPI, Playwright) + React **agent panel** (`/ui/`). One gateway orchestrates everything — scrape engine, marketplace export, integrate channels, and VPS operations.

## What it is

| Layer | What it does |
|---|---|
| **Gateway agent** | LLM + tools + skills — chat, cron jobs, workflows |
| **Agent panel** | Configure LLM, skills, schedules, health, firewall, App Store |
| **Integrate** | Same agent over **Telegram**, Discord, Slack, Email |
| **Scrape & data** | Concurrent engine, AI extraction, catalog monitor, batch jobs, export |
| **Hub & registry** | Built-in + installable **skills** (`SKILL.md`), **source plugins** (ZIP), App Store drivers |
| **Self-host** | Local dev, Docker, VPS one-liner — your machine or your server |

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Python | **3.12+** | Install via [python.org](https://www.python.org/downloads/) |
| uv | latest | Auto-installed by setup scripts |
| Node.js | **20+** | Required for the web panel UI build |
| Git | any | Required to clone the repo |

---

## Install — one liner

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

VPS (opens port 8787 in firewall, uses `/www/wwwroot/crossborder_scraper`):

```bash
CROSSBORDER_VPS=1 bash <(curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh)
```

### Windows (PowerShell — Run as Administrator)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
```

### Docker

```bash
git clone https://github.com/vannyakh/crossborder_scraper.git && cd crossborder_scraper
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The panel will be at `http://localhost:8787/ui/`.

---

## Manual install (step by step)

<details>
<summary><strong>macOS</strong></summary>

```bash
# 1. Prerequisites
brew install python@3.12 node git   # or install python from python.org + node from nodejs.org
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Clone
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper

# 3. Python deps + browser
uv sync
uv run playwright install chromium

# 4. Web panel (optional but recommended)
cd apps/web && npm install -g pnpm && pnpm install && pnpm build && cd ../..

# 5. Config
cp .env.example .env
cp config/ui_config.example.json config/ui_config.json

# 6. First-run setup (generates credentials, sets port)
uv run crossborder install --port 8787

# 7. Start
uv run serve
# → http://127.0.0.1:8787/ui/
```

</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
# 1. System packages
sudo apt-get update && sudo apt-get install -y git curl ca-certificates build-essential

# 2. Python 3.12
sudo apt-get install -y python3.12 python3.12-venv
# or use deadsnakes: sudo add-apt-repository ppa:deadsnakes/ppa

# 3. Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # or open a new terminal

# 5. Clone
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper

# 6. Python deps + browser
uv sync
uv run playwright install chromium
uv run playwright install-deps chromium   # installs system libs

# 7. Web panel
cd apps/web && npm install -g pnpm && pnpm install && pnpm build && cd ../..

# 8. Config
cp .env.example .env
cp config/ui_config.example.json config/ui_config.json

# 9. Setup
uv run crossborder install --port 8787

# 10. Start (foreground)
uv run serve
# → http://127.0.0.1:8787/ui/

# Or run as a background service:
uv run crossborder service start
```

</details>

<details>
<summary><strong>Windows</strong></summary>

**Prerequisites — install in order:**

1. [Python 3.12+](https://www.python.org/downloads/) — check **"Add to PATH"** during install
2. [Node.js 20+](https://nodejs.org/) — LTS recommended
3. [Git for Windows](https://git-scm.com/download/win)

**Then in PowerShell (as Administrator):**

```powershell
# Install uv
irm https://astral.sh/uv/install.ps1 | iex

# Clone
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper

# Python deps + browser
uv sync
uv run playwright install chromium

# Web panel
cd apps\web
npm install -g pnpm
pnpm install
pnpm build
cd ..\..

# Config
copy .env.example .env
copy config\ui_config.example.json config\ui_config.json

# Setup
uv run crossborder install --port 8787

# Start
uv run serve
# → http://127.0.0.1:8787/ui/
```

</details>

---

## Configuration

### `.env` — server bind and login

```
PANEL_AUTH_ENABLED=true
PANEL_USERNAME=your_username
PANEL_PASSWORD=your_password

PANEL_HOST=0.0.0.0   # bind all interfaces (required for VPS / LAN access)
PANEL_PORT=8787

# PANEL_EXTERNAL_HOST=your.domain.com   # set for correct login URL display
```

Generated automatically by `crossborder install`. Do not commit this file.

### `config/ui_config.json` — LLM, agent, skills, integrations

Managed through the **Settings** page in the panel. Key fields:

| Section | What to configure |
|---|---|
| `llm` | Provider (OpenAI, Claude, Qwen, …), model, API key |
| `agent` | System prompt, enabled tools |
| `telegram` | Bot token for the integrate channel |
| `scrape` | Workers, proxy, browser pool size |

---

## Running

### Development (hot reload)

```bash
# Terminal 1 — API with reload
make run-dev        # or: bash scripts/serve-api.sh

# Terminal 2 — Vite UI on :5173 (proxy to API on :8787)
make run-dev-ui     # or: cd apps/web && pnpm dev
```

Open `http://localhost:5173/ui/` for the live-reload panel.

### Production (local or VPS)

```bash
# Build the panel UI bundle first
make build-prod       # or: cd apps/web && pnpm build

# Start the API (serves built bundle at /ui/)
make run-prod         # or: uv run serve
# → http://127.0.0.1:8787/ui/
```

### Background service

```bash
crossborder service start    # start in background, auto-log to data/panel.log
crossborder service status
crossborder service stop
crossborder service logs     # tail logs
```

### Docker (production)

```bash
# Build + start
make run-prod-docker
# or:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop
docker compose down

# Logs
docker compose logs -f
```

---

## CLI quick reference

```bash
crossborder --help
crossborder service start          # background panel
crossborder serve --no-reload      # foreground panel
crossborder gateway                # agent hub status
crossborder chat                   # interactive agent chat
crossborder agent "list schedules" # one-shot agent command
crossborder skills list            # installed skills
crossborder schedules list         # cron schedules
crossborder integrate list         # Telegram / Discord channels
crossborder discover tools         # available agent tools
crossborder rules list --local     # active agent rules
```

---

## VPS access checklist

If the panel is unreachable from the browser after installing on a VPS:

1. **Cloud security group** — allow inbound TCP `8787` to your server
2. **Host firewall** — `sudo ufw allow 8787/tcp && sudo ufw reload`
3. **Panel bind** — confirm `.env` has `PANEL_HOST=0.0.0.0`
4. **Health check** — `curl -sI http://127.0.0.1:8787/health`
5. **From your PC** — `curl -sI http://<your-server-ip>:8787/health`

Or run the built-in network access helper:

```bash
crossborder deploy setup-access
```

---

## Update

```bash
# From the install directory
git pull
uv sync
make build-prod     # rebuild UI

crossborder service restart
```

One-liner re-install (also updates):

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

---

## License

Use responsibly. Respect each marketplace and source site's terms of service; prefer official APIs for publishing listings.
