# Self-hosting guide

Deploy Cross-Border on your laptop, home server, or cloud VPS.

**Step-by-step install walkthrough:** [INSTALL.md](INSTALL.md)

---

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

| Step | What happens |
|------|----------------|
| Clone / update | `~/crossborder-scraper` (default) |
| Dependencies | Python (uv), Node.js on Linux servers, Playwright, panel web UI |
| Setup | Panel credentials, `.env`, bind `0.0.0.0:8787` |
| Security | Server/VPS profile: secret entrance path + access key |
| Auto-start | systemd (Linux) or launchd (macOS) |
| nginx (optional) | Auto-configures when nginx is already installed; use `CROSSBORDER_NGINX=1` to install |
| Start | Panel runs in background; prints **install access card** |

**Production VPS** — pin a release:

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  env CROSSBORDER_BRANCH=main bash
```

**Public IP on port 80** (nginx reverse proxy):

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  env CROSSBORDER_NGINX=1 bash
```

**Help:**

```bash
CROSSBORDER_HELP=1 curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

### Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
```

### Install profiles

| Target | Command | Install dir | Security entrance |
|--------|---------|-------------|-------------------|
| Mac / Linux desktop | one-liner | `~/crossborder-scraper` | Optional |
| Cloud VPS | one-liner | `~/crossborder-scraper` | On (server profile) |
| wwwroot production | `CROSSBORDER_VPS=1` | `/www/wwwroot/crossborder_scraper` | On |

The installer auto-detects Linux servers (public IP or headless SSH) and applies the **server profile**: bind all interfaces, open host firewall when possible, security entrance, `PANEL_PUBLIC_HTTP_PORT=80`.

---

## Requirements

| Component | Minimum |
|-----------|---------|
| OS | Linux (Ubuntu 22.04+), macOS, Windows Server |
| RAM | 4 GB (8 GB+ for Playwright + batches) |
| Disk | 10 GB + scrape output |
| Python | 3.12+ (installed automatically via uv) |
| Docker | Optional — see [Docker](#docker) |

---

## After install

```bash
crossborder service status
crossborder tools update            # pull + sync + restart
crossborder deploy status           # listen addresses + public URL
crossborder gateway                 # agent hub status
```

**Logs:** `~/crossborder-scraper/data/panel.log`

If `crossborder: command not found`: `source ~/.bashrc` or open a new terminal.

---

## Public access

### Direct panel port (8787)

```bash
curl -sI http://127.0.0.1:8787/health          # on server
curl -sI http://YOUR_PUBLIC_IP:8787/health     # from your PC
```

Open **cloud security group** TCP **8787** and **host firewall** if needed.

### nginx on port 80 (recommended for VPS)

Panel listens on **127.0.0.1:8787**; nginx proxies **80 → 8787**.

- **Auto:** re-run install when nginx is already on the server — installer writes the site config
- **Install nginx too:** `CROSSBORDER_NGINX=1` on the install one-liner
- **Manual:** `crossborder deploy nginx -o deploy/nginx-panel.conf`

Open cloud security group TCP **80** (and **443** for HTTPS).

Test:

```bash
curl -sI http://YOUR_PUBLIC_IP/health
```

Use the **Access URL** from the install card when security entrance is enabled.

### HTTPS with a domain

1. **DNS** — A record: `panel.yourdomain.com → YOUR_SERVER_IP`
2. **Cloud security group** — allow TCP **80** and **443**
3. **On the server:**

```bash
cd ~/crossborder-scraper
sudo bash scripts/deploy-https.sh panel.yourdomain.com
```

4. **Verify:**

```bash
curl -sI https://panel.yourdomain.com/health
```

Login: `https://panel.yourdomain.com/{entry}/ui/login?access_key=…` (same credentials from install).

---

## Security entrance

Enabled by default on **server** and **wwwroot** profiles.

| URL | Result |
|-----|--------|
| `http://IP/ui/login` | **404** |
| `http://IP/{entry}/?access_key=KEY` | Sets cookie → login |
| `http://IP/{entry}/ui/login?access_key=KEY` | Login page |

See [INSTALL.md — Security entrance](INSTALL.md#security-entrance).

---

## Updating

See [INSTALL.md — Re-run without losing data](INSTALL.md#re-run-installer-without-losing-data).

**Recommended:**

```bash
cd ~/crossborder-scraper
crossborder tools update
```

**Re-run installer** (updates code + UI, keeps `.env` and data):

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

---

## Optional environment variables

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_BRANCH` | Git branch or tag (default `main`) |
| `CROSSBORDER_INSTALL_DIR` | Custom install path |
| `CROSSBORDER_PORT` | Panel port (default **8787**) |
| `CROSSBORDER_NGINX=1` | Install nginx + HTTP proxy on port 80 |
| `CROSSBORDER_SKIP_NGINX=1` | Skip nginx setup |
| `CROSSBORDER_START=0` | Do not auto-start panel |
| `CROSSBORDER_SKIP_BROWSER=1` | Skip Playwright |
| `CROSSBORDER_SKIP_FIREWALL=1` | Skip auto ufw on cloud VMs |
| `CROSSBORDER_KEEP_LOCAL=1` | Keep local git commits on re-run |
| `CROSSBORDER_VPS=1` | Force `/www/wwwroot` layout + security entrance |
| `PANEL_SECURITY_ENTRANCE=1` | Secret login path + access key |

---

## Advanced: wwwroot layout

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  sudo env CROSSBORDER_VPS=1 bash
```

Or [`scripts/install-vps.sh`](../scripts/install-vps.sh).

| Path | Purpose |
|------|---------|
| `/www/wwwroot/crossborder_scraper/` | App root |
| `var/data/` | Scrape DB, cookies, output |
| `var/plugins/` | Scrape plugins (ZIP) |
| `var/skills/` | Agent skills (ZIP) |

Full map: [DIRECTORY_LAYOUT.md](DIRECTORY_LAYOUT.md).

---

## From git clone

```bash
git clone https://github.com/vannyakh/crossborder_scraper.git
cd crossborder_scraper
bash scripts/install.sh
```

---

## Docker

Published image:

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

## Security checklist

- Save the install access card — credentials are not shown again.
- Change password after first login: `crossborder tools reset credentials`.
- Use nginx + TLS for public internet access.
- Keep `.env` out of git.

---

## Related docs

| Doc | Contents |
|-----|----------|
| [INSTALL.md](INSTALL.md) | Step-by-step VPS install, update, troubleshooting |
| [DIRECTORY_LAYOUT.md](DIRECTORY_LAYOUT.md) | Install paths on a VPS |
| [CLI.md](CLI.md) | `crossborder` commands |
