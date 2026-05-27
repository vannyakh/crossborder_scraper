# Self-hosting guide

Deploy Crossborder Scraper on your own VPS, Docker host, or Windows server — similar workflow to **aaPanel**, **n8n**, or **OpenClaw** self-host installs.

## Requirements

| Component | Minimum |
|-----------|---------|
| OS | Linux (Ubuntu 22.04+), macOS, Windows Server |
| RAM | 4 GB (8 GB+ for Playwright + batches) |
| Disk | 10 GB + scrape output |
| Python | 3.12+ (or use Docker only) |
| Docker | Optional but recommended for production |

## Quick install (one-liner)

Works on **macOS, Linux, and Windows**. Installs Python (via [uv](https://docs.astral.sh/uv/)), Playwright, and prints **panel URL, server IP, username, and password** in the terminal (aaPanel-style).

### macOS & Linux

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

### Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
```

Environment (optional):

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_INSTALL_DIR` | Install path (default `~/crossborder-scraper`) |
| `CROSSBORDER_REPO` | Git URL (forks / private mirrors) |
| `CROSSBORDER_START=1` | Start `scraper serve` in background after install |
| `CROSSBORDER_SKIP_BROWSER=1` | Skip Playwright (Docker-only hosts) |

### From git clone

```bash
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper
bash scripts/install.sh
```

Or with CLI only:

```bash
uv sync
uv run scraper setup --server
```

Setup prints an **aaPanel-style access card**: panel URL, server IP(s), username, and password (also saved to `.env`).

```bash
uv run scraper setup --server --external 203.0.113.10   # show public URL on VPS
uv run scraper setup --port 8080                        # fixed port
uv run scraper setup --fixed-port                       # keep 8000 even if busy
```

## Setup modes (`scraper setup`)

| Flag | Use case |
|------|----------|
| *(default)* | Panel login + seed `config/` only |
| `--server` | Full bare-metal: deps, Playwright, data dirs |
| `--docker` | Prepare configs for container deploy (no local browser) |
| `--host` | Bind address (default `0.0.0.0`) |
| `--port` / `-p` | Panel TCP port (auto-picks next free if 8000 is taken) |
| `--external` / `-e` | Public IP or domain shown in the summary |

## Software tools (`scraper tools`)

Maintain the installed panel after setup (like aaPanel app update / restart):

```bash
uv run scraper tools sync              # git pull + uv sync
uv run scraper tools update            # sync + Playwright + restart panel
uv run scraper tools restart           # Docker / systemd / process on panel port
uv run scraper tools reset credentials # new panel username/password
uv run scraper tools reset config -y   # restore example configs (*.bak backup)
uv run scraper tools reset data -y     # clear output, cookies, products.db
uv run scraper tools reset all -y      # credentials + config + data + cache
```

Shell wrapper: `bash scripts/tools.sh update`

| Command | What it does |
|---------|----------------|
| `sync` | Pull git (if repo), `uv sync`, optional `--browser`, `--docker-rebuild` |
| `update` | `sync` + update Playwright + **restart** panel |
| `restart` | `docker compose restart`, `systemctl restart crossborder-scraper`, or stop process on `PANEL_PORT` |
| `reset` | Scoped reset; destructive scopes need `--yes` |

## Deploy commands (`scraper deploy`)

Like n8n / OpenClaw — one CLI for operations:

```bash
uv run scraper deploy setup          # same as setup --server
uv run scraper deploy status           # OS, Docker, API health
uv run scraper deploy up               # docker compose up -d --build
uv run scraper deploy down
uv run scraper deploy ps
uv run scraper deploy systemd          # write deploy/crossborder-scraper.service
uv run scraper deploy nginx -n scraper.example.com
```

### Docker (recommended)

```bash
cp .env.example .env
uv run scraper setup --docker
uv run scraper deploy up
```

Uses `docker-compose.yml` + `docker-compose.prod.yml` (healthcheck, volumes for `data/`, `config/`, plugins, skills).

Open: `http://YOUR_SERVER_IP:8000/ui/`

### systemd (always-on service)

```bash
uv run scraper setup --server
uv run scraper deploy systemd -o /tmp/crossborder-scraper.service
sudo cp /tmp/crossborder-scraper.service /etc/systemd/system/
sudo systemctl enable --now crossborder-scraper
```

### aaPanel / nginx reverse proxy

1. Run the panel on `127.0.0.1:8000` (Docker or systemd).
2. Generate nginx config:

```bash
uv run scraper deploy nginx -n scraper.yourdomain.com -o /www/server/panel/vhost/nginx/scraper.conf
```

3. Add SSL in aaPanel → paste config → reload nginx.

WebSocket paths (`/jobs/.../ws`) are proxied for the live monitor.

### Windows

```powershell
.\scripts\setup.ps1
uv run scraper serve --no-reload
```

## What gets created

| Path | Purpose |
|------|---------|
| `.env` | Panel username/password, bind host/port |
| `config/ui_config.json` | AI, marketplaces, engine (from UI) |
| `config/agent_skills.yaml` | Enabled agent skills |
| `data/` | Cookies, SQLite, scrape output |
| `installed_plugins/` | ZIP scrape plugins |
| `installed_skills/` | ZIP agent skills |

## Updating

```bash
git pull
uv sync
uv run scraper deploy up --build    # Docker
# or restart systemd service
```

## Security checklist

- Change default panel password after first login (`scraper setup --regenerate`).
- Put nginx/aaPanel TLS in front; do not expose port 8000 publicly without auth.
- Keep `.env` out of git.
