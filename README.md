# Cross-Border Product Scraper

Scrape wholesale/retail listings from **1688**, **Taobao**, and **AliExpress**, then publish to **Shopee**, **Lazada**, **TikTok Shop**, or **Shopify**.

Built with **Python 3.12+**, **Playwright** (browser automation), **Pydantic** (data models), and official marketplace APIs for export.

## Why Playwright?

| Tool | Best for |
|------|----------|
| **Playwright** (default) | 1688, Taobao — heavy JavaScript, login, anti-bot |
| **httpx** | AliExpress public pages, API backends |
| **Official APIs** | Shopee, Lazada, TikTok Shop, Shopify — required for listing |

Chinese B2B sites ([1688.com](https://www.1688.com/)) rarely expose stable public APIs. A real browser with saved cookies is the most reliable approach for sellers.

## Quick start

### 1. Environment (recommended: [uv](https://docs.astral.sh/uv/))

```bash
# Install uv (once)
curl -LsSf https://astral.sh/uv/install.sh | sh

cd crossborder_scraper
uv sync
source .venv/Scripts/activate   # Windows Git Bash
# .venv\Scripts\activate       # Windows CMD/PowerShell

uv run playwright install chromium
```

### 2. Configure

```bash
cp .env.example .env
cp config/ui_config.example.json config/ui_config.json
crossborder setup        # auto-generates PANEL_USERNAME + PANEL_PASSWORD in .env
# (alias: scraper)
# Configure AI, engine, and marketplace keys in the web UI (Settings) or ui_config.json
```

Panel login credentials are printed once and saved to `.env` as `PANEL_USERNAME` / `PANEL_PASSWORD`.

Set `PANEL_HOST` (default `0.0.0.0`) and `PANEL_PORT` (default `8000`) in `.env` for the API bind address and sidebar access IP.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the gateway + agent + workflow design (inspired by n8n workflows and OpenClaw's control plane).

### 3. Login (1688 / Taobao need this)

```bash
python main.py login 1688
# Browser opens → log in → press Enter in terminal
```

Cookies are stored in `data/cookies/`.

### 4. Scrape a product

```bash
python main.py scrape "https://detail.1688.com/offer/XXXXXXXX.html"
python main.py scrape "https://www.aliexpress.com/item/XXXXXXXX.html" --headed
```

Output: SQLite (`data/products.db`) + JSON (`data/output/`).

### 5. Export to marketplace

```bash
# Preview listing (no API)
python main.py export "https://..." shopify --scrape --dry-run

# Publish (configure marketplaces in Settings → ui_config.json)
python main.py export "https://..." shopify --scrape
python main.py export "https://..." shopee --scrape
```

### Batch scrape (concurrent engine)

```bash
python main.py batch urls.txt --workers 5
python main.py batch urls.txt --ai          # force AI extraction
python main.py engine                       # show workers, proxies, cookies, AI config
```

### Gateway + AI agent (control plane)

```bash
uv run serve                                # API + panel UI (or: crossborder serve)
bash scripts/serve-api.sh                   # same, with reload
crossborder --help                          # all commands & options
crossborder gateway                         # gateway status
crossborder skills list --local             # OpenClaw-style SKILL.md skills
crossborder agent "list marketplaces and last 5 products"
crossborder plugins                         # source plugin catalog
```

CLI uses the same HTTP API as the web panel (`/gateway/*`). Use `--local` on `scraper agent` / `scraper skills` to skip the HTTP server.

Shell helpers: see [scripts/README.md](scripts/README.md).

### Self-hosting (VPS / Docker / aaPanel)

**One-liner** (clone, install deps, generate panel URL + login — like OpenClaw / aaPanel):

```bash
# macOS & Linux
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

```powershell
# Windows
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
```

From an existing clone:

```bash
bash scripts/install.sh
# or: uv run scraper setup --server
uv run scraper deploy up          # Docker
# or: uv run scraper deploy systemd && uv run scraper deploy nginx
```

Auto-start panel after install: `CROSSBORDER_START=1 curl ... | bash`

**Maintain after install:** `crossborder tools update` (sync + restart) · `crossborder tools reset credentials`

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for aaPanel, nginx, Windows, and systemd.

### Agent page + cron schedules

Open **Agent** in the sidebar (`/ui/agent`) for chat, tool trace, and background cron tasks.

Role prompts: `libs/prompts/*.md` · Agent skills: `skills/*/SKILL.md` (enable in `config/agent_skills.yaml` or **Agent → Skills**).

Schedules in `config/agent_schedules.json`:

```bash
cp config/agent_schedules.example.json config/agent_schedules.json
```

## Scrape Engine (multi-job concurrency)

The core engine runs **multiple scrape jobs in parallel** using asyncio workers + Playwright browser pool.

| Module | Role |
|--------|------|
| `core/engine/executor.py` | `ScrapeEngine` — job queue, batch runner |
| `core/engine/pool.py` | `BrowserPool` — shared browser, isolated contexts |
| `core/proxy.py` | `ProxyPool` — rotate proxies from `config/proxies.txt` |
| `core/cookies.py` | `CookieManager` — per-site + named sessions |
| `core/ai/extractor.py` | `AIExtractor` — LLM fallback when CSS parse fails |

```python
import asyncio
from core.engine import ScrapeEngine, ScrapeJob
from config import get_settings

async def main():
    engine = ScrapeEngine(get_settings(), max_workers=5)
    jobs = [ScrapeJob(url="https://...", session_id="account1")]
    report = await engine.run_batch(jobs)
    print(report.success_rate)

asyncio.run(main())
```

### Proxies

Add proxies to `config/proxies.txt` (one per line). Each worker gets a rotated proxy + cookie session.

### Cookies (multi-account)

```bash
python main.py login 1688 --session seller_a
python main.py login 1688 --session seller_b
# Jobs use session_id="seller_a" in ScrapeJob
```

### AI-powered scraping

When CSS selectors break (common on 1688/Taobao), enable AI fallback:

```env
AI_ENABLED=true
AI_API_KEY=sk-...
AI_FALLBACK=true          # auto when parse looks incomplete
AI_BASE_URL=https://api.openai.com/v1
# Local Ollama: AI_BASE_URL=http://localhost:11434/v1  AI_MODEL=llama3.2
```

```bash
python main.py scrape URL --ai
python main.py batch urls.txt --ai
```

## Project layout

```
apps/web/               # React panel (Vite)
src/
├── cli/                # Typer CLI (`scraper` command)
├── config/             # Settings from .env + ui_config.json
├── core/               # Engine, AI, plugins, models
├── sites/              # 1688, Taobao, AliExpress
├── plugins/            # Built-in social/custom source plugins
├── pipeline/           # Normalize + SQLite storage
├── export/             # Shopee, Lazada, TikTok Shop, Shopify
├── gateway/            # Agent tools & workflows
└── server/             # FastAPI API + App Store
config/                 # Runtime YAML/JSON (plugins.yaml, sites.yaml)
data/                   # Cookies, output, products.db
installed_plugins/      # Sandboxed ZIP scrape plugins
```

Full map: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Adding a new source site

1. Create `src/sites/my_site.py` extending `BaseScraper`.
2. Implement `extract_product_id`, `parse_html`, and CSS selectors.
3. Register in `sites/registry.py`.

## Marketplace API setup

| Platform | Portal |
|----------|--------|
| Shopee | [open.shopee.com](https://open.shopee.com/) |
| Lazada | [open.lazada.com](https://open.lazada.com/) |
| TikTok Shop | [partner.tiktokshop.com](https://partner.tiktokshop.com/) |
| Shopify | Admin → Settings → Apps → Develop apps |

Image upload: most APIs require uploading images to their CDN first, then referencing IDs in `add_product`. Extend exporters in `export/` as needed.

## Production tips

- **Proxies**: set `PROXY_SERVER` in `.env` (residential recommended for Taobao).
- **Rate limits**: increase `REQUEST_DELAY_SECONDS`.
- **Legal**: respect each site's Terms of Service and robots rules; use official APIs where required.
- **Selectors**: 1688/Taobao change layouts often — update `sites/*.py` selectors when parsing fails.

## Commands

```bash
python main.py sites          # List platforms
python main.py engine         # Engine config (workers, proxy, AI)
python main.py scrape URL [--ai] [--headed]
python main.py login SITE [--session NAME]
python main.py export URL MARKETPLACE [--scrape] [--dry-run]
python main.py batch urls.txt [--workers N] [--ai]
```

## Web service (monitor & control)

Run the API locally (from this repo root, using **this project's** `.venv`):

```bash
# Recommended — uses crossborder_scraper/.venv (ignores other VIRTUAL_ENV)
uv run serve

# Alternatives
uv run python -m uvicorn server.app:app --host 0.0.0.0 --port 8000
source .venv/Scripts/activate   # Git Bash on Windows
python -m uvicorn server.app:app --host 0.0.0.0 --port 8000
```

If you see `uvicorn: command not found`, your shell is using another project's venv
(e.g. `www.1688.com`). Run `deactivate`, then `uv sync` in this folder, then `uv run serve`.

Endpoints:

- `GET /health` · `GET /config` · `GET /stats`
- **Jobs:** `POST /jobs/submit` · `POST /jobs/scrape` (single URL) · `GET /jobs/{id}/status` · `GET /jobs/{id}/result` · `POST /jobs/{id}/cancel`
- **Batches:** `GET /batches` · `GET /batches/{id}` (persisted history)
- **Products:** `GET /products` · `GET /products/{id}` · `DELETE /products/{id}` · `POST /products/export`
- **Files:** `GET /files` · `GET /files/{path}` · `DELETE /files/{path}` (output JSON/HTML)

Example submit:

```bash
curl -X POST "http://localhost:8000/jobs/submit" \
  -H "content-type: application/json" \
  -d "{\"urls\":[\"https://detail.1688.com/offer/XXX.html\"],\"workers\":3,\"use_ai\":false,\"save\":true}"
```

## Docker

Build + run API:

```bash
docker compose up --build
```

API will be on `http://localhost:8000`.

## React UI (Vite + TypeScript)

Dev UI (with API proxy):

```bash
cd apps/web
pnpm install
pnpm dev
```

Or from the repo root: `bash scripts/dev-ui.sh`

Production UI is built into `apps/web/dist` and served by the API at `http://localhost:8000/ui/`.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the full folder map.
