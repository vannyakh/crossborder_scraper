# Self-hosting guide

Deploy Cross-Border on your laptop, home server, or cloud VPS — **one install command** for all of them.

## Install (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

That single command:

| Step | What happens |
|------|----------------|
| Clone | Into `~/crossborder-scraper` (default) |
| Dependencies | Python (uv), Node.js on Linux servers, Playwright, panel web UI |
| Setup | Panel credentials, `.env`, bind `0.0.0.0:8787` |
| Auto-start | systemd (Linux) or launchd (macOS) — survives reboot |
| Start | Panel runs in background; prints **login URL, username, password** |

Open the printed **Login URL** in your browser (port **8787**, not Vite `:5173`).

**Production VPS** — pin a release tag:

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  env CROSSBORDER_BRANCH=v0.1.1 bash
```

**Help** — full options list:

```bash
CROSSBORDER_HELP=1 curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

### Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
```

### Where it works

| Target | Command | Install dir | Notes |
|--------|---------|-------------|-------|
| **Mac / Linux desktop** | same one-liner | `~/crossborder-scraper` | Local + LAN access |
| **Cloud VPS** (Ubuntu, etc.) | same one-liner | `~/crossborder-scraper` | Auto-detects server: firewall, public IP URLs |
| **wwwroot production** | add `CROSSBORDER_VPS=1` | `/www/wwwroot/crossborder_scraper` | See [Advanced](#advanced-wwwroot-layout) |

The installer **auto-detects Linux servers** (public IP or headless SSH) and applies the server profile: bind all interfaces, open host firewall when possible, print LAN + public login URLs.

---

## Requirements

| Component | Minimum |
|-----------|---------|
| OS | Linux (Ubuntu 22.04+), macOS, Windows Server |
| RAM | 4 GB (8 GB+ for Playwright + batches) |
| Disk | 10 GB + scrape output |
| Python | 3.12+ (installed automatically via uv) |
| Docker | Optional — see [Docker](#docker) below |

---

## After install

```bash
crossborder --help
crossborder service status
crossborder gateway              # agent hub status
crossborder chat                 # interactive agent
crossborder tools update         # pull + sync + restart
crossborder deploy status        # listen addresses + public URL
```

If `crossborder: command not found`: `source ~/.bashrc` or open a new terminal.

**Logs:** `~/crossborder-scraper/data/panel.log` (or your install dir).

### Cloud VPS — if browser cannot connect

Local health check on the server:

```bash
curl -sI http://127.0.0.1:8787/health
```

If that works but your PC cannot reach the public IP:

1. **Cloud security group** — allow inbound **TCP 8787**
2. **Host firewall** — `sudo ufw allow 8787/tcp` or `crossborder deploy firewall`
3. **Verify bind** — `ss -tln | grep 8787` (should show `0.0.0.0:8787`)
4. **Test remotely** — `curl -sI http://YOUR_PUBLIC_IP:8787/health`

Panel: **Settings → Network & firewall**.

### HTTPS with a domain (production)

Host-panel style: panel on **127.0.0.1:8787**, **nginx** terminates TLS on **443**.

#### 1. Cloud security group (Tencent / other VPS)

Inbound rules on the instance bound to **43.x.x.x** (your public IP):

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | **80** | `0.0.0.0/0` | Let's Encrypt HTTP challenge |
| TCP | **443** | `0.0.0.0/0` | HTTPS panel |

You do **not** need port **8787** open to the public once HTTPS works (nginx proxies locally).

#### 2. DNS

Create an **A record**:

```text
panel.yourdomain.com  →  YOUR_SERVER_PUBLIC_IP
```

Wait until it resolves (check: `dig +short panel.yourdomain.com`).

#### 3. Run on the server (SSH)

```bash
cd ~/crossborder-scraper
git pull
sudo bash scripts/deploy-https.sh panel.yourdomain.com
```

Or the CLI directly:

```bash
sudo env HOME="$HOME" PATH="$HOME/.local/bin:$PATH" crossborder deploy https -n panel.yourdomain.com
```

This installs **nginx** + **certbot** (Ubuntu apt), writes the site config, opens ufw **80/443**, and requests a Let's Encrypt certificate.

#### 4. Verify

```bash
curl -sI "https://panel.yourdomain.com/health"
```

Login: **`https://panel.yourdomain.com/ui/login`** (same username/password from install).

Manual nginx template only:

```bash
crossborder deploy nginx -n panel.yourdomain.com --ssl -o deploy/nginx-panel.conf
```

### wwwroot co-install (host panel servers)

If `/www/wwwroot` already exists (typical on host-panel VPS), the installer auto-selects **wwwroot profile** and installs to:

```text
/www/wwwroot/crossborder_scraper/
```

Or force it:

```bash
curl -fsSL .../install.sh | sudo env CROSSBORDER_VPS=1 bash
```

---

## Optional environment variables

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_BRANCH` | Git branch or tag (default `main`; use `v0.1.1` for releases) |
| `CROSSBORDER_INSTALL_DIR` | Custom install path |
| `CROSSBORDER_PORT` | Panel port (default **8787**) |
| `CROSSBORDER_START=0` | Do not auto-start panel |
| `CROSSBORDER_SKIP_BROWSER=1` | Skip Playwright |
| `CROSSBORDER_SKIP_FIREWALL=1` | Skip auto ufw on cloud VMs |
| `CROSSBORDER_VPS=1` | Force `/www/wwwroot` layout + security entrance |
| `PANEL_SECURITY_ENTRANCE=1` | Secret login path + access key |

---

## Advanced: wwwroot layout

For production hosts that use `/www/wwwroot` (optional — most VPS installs use home dir):

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  sudo env CROSSBORDER_VPS=1 CROSSBORDER_BRANCH=v0.1.1 bash
```

Or the wrapper script:

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install-vps.sh | \
  sudo env CROSSBORDER_BRANCH=v0.1.1 bash
```

| Path | Purpose |
|------|---------|
| `/www/wwwroot/crossborder_scraper/` | App root |
| `var/data/` | Scrape DB, cookies, output |
| `var/plugins/` | Scrape plugins (ZIP) |
| `var/skills/` | Agent skills (ZIP) |

Full map: [DIRECTORY_LAYOUT.md](DIRECTORY_LAYOUT.md).

**Security entrance** (wwwroot only by default): secret path + access key in `.env`. Enable on any install with `PANEL_SECURITY_ENTRANCE=1`.

HTTPS: `sudo bash scripts/deploy-https.sh your.domain.com`

---

## From git clone

```bash
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper
bash scripts/install.sh
```

---

## Docker

Published image (every release):

```bash
docker pull ghcr.io/vannyakh/crossborder_scraper:0.1.1
docker run -d --name crossborder \
  -p 8787:8787 \
  -v crossborder-data:/app/data \
  -v crossborder-config:/app/config \
  --env-file .env \
  --restart unless-stopped \
  ghcr.io/vannyakh/crossborder_scraper:0.1.1
```

From clone:

```bash
cp .env.example .env
uv run crossborder setup --docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Updating

```bash
cd ~/crossborder-scraper
crossborder tools update
```

Or re-run the one-liner (updates in place):

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

---

## Security checklist

- Save the install access card — credentials are not shown again.
- Change password after first login: `crossborder tools reset credentials`.
- Use nginx + TLS for public internet access.
- Keep `.env` out of git.
