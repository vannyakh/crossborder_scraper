# Quick start

## 1. Install

Recommended: [uv](https://docs.astral.sh/uv/)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
cd crossborder_scraper
uv sync
source .venv/Scripts/activate   # Windows Git Bash
uv run playwright install chromium
```

## 2. Configure

```bash
cp .env.example .env
cp config/ui_config.example.json config/ui_config.json
crossborder setup        # writes PANEL_USERNAME + PANEL_PASSWORD to .env
```

Set `PANEL_HOST` and `PANEL_PORT` in `.env` for API bind and sidebar URL. Configure AI, engine, and marketplace keys in the web UI (**Settings**) or `config/ui_config.json`.

## 3. Login (1688 / Taobao)

```bash
python main.py login 1688
```

Cookies are stored in `data/cookies/`.

## 4. Scrape

```bash
python main.py scrape "https://detail.1688.com/offer/XXXXXXXX.html"
python main.py scrape "https://www.aliexpress.com/item/XXXXXXXX.html" --headed
```

Output: SQLite (`data/products.db`) + JSON (`data/output/`).

## 5. Export

```bash
python main.py export "https://..." shopify --scrape --dry-run
python main.py export "https://..." shopify --scrape
python main.py export "https://..." shopee --scrape
```

## Batch scrape

```bash
python main.py batch urls.txt --workers 5
python main.py batch urls.txt --ai
python main.py engine
```

## Panel + agent

```bash
uv run serve
crossborder gateway
crossborder agent "list marketplaces and last 5 products"
crossborder skills list --local
```

Open **Agent** in the sidebar for chat, cron schedules, and skills. Copy `config/agent_schedules.example.json` → `config/agent_schedules.json` for scheduled tasks.

## Self-hosting one-liner

Same command for **local machine, LAN server, and cloud VPS**:

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

Production VPS: add `env CROSSBORDER_BRANCH=v0.1.1` before `bash`.
Windows + full guide: [SELF_HOSTING.md](SELF_HOSTING.md)

After install: `crossborder service status` · `crossborder tools update` · `crossborder deploy status`
