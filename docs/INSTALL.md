# Panel install instructions

Step-by-step guide for installing and updating the Cross-Border agent panel.

Full reference: [SELF_HOSTING.md](SELF_HOSTING.md)

---

## One command

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| [`scripts/install.sh`](../scripts/install.sh) | Main installer — local, LAN server, cloud VPS |
| [`scripts/install-vps.sh`](../scripts/install-vps.sh) | Forces `/www/wwwroot` layout + security entrance |
| [`scripts/deploy-https.sh`](../scripts/deploy-https.sh) | nginx + Let's Encrypt (requires a domain) |

---

## Fresh install on a new VPS

### 1. Prepare the server

| Requirement | Minimum |
|-------------|---------|
| OS | Ubuntu 22.04+ |
| RAM | 4 GB (8 GB+ for Playwright batches) |
| Disk | 10 GB + scrape output |
| Access | SSH user with sudo |

### 2. Cloud firewall (security group)

| Port | When |
|------|------|
| **22** | SSH |
| **80** | nginx public access (recommended) |
| **443** | HTTPS with a domain |
| **8787** | Direct panel access (optional if nginx on 80) |

### 3. SSH and install

```bash
ssh ubuntu@YOUR_VPS_IP

# Standard VPS (home dir, security entrance, auto-detect server profile)
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash

# With nginx install + port 80 proxy (recommended for public IP)
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  env CROSSBORDER_NGINX=1 bash

# Pin a release
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | \
  env CROSSBORDER_BRANCH=main bash
```

### 4. What the installer does

1. Clones or updates the repo into `~/crossborder-scraper`
2. Installs **uv**, Python deps, Playwright, Node.js + pnpm
3. Builds the panel web UI
4. Writes `.env` (username, password, security entrance on server profile)
5. Registers systemd auto-start and starts the panel on **8787**
6. **nginx:** if already installed (or `CROSSBORDER_NGINX=1`), writes HTTP proxy on port **80**
7. Prints the **install access card**

### 5. Save the install access card

The installer ends with a compact card — copy it before closing the terminal:

```text
============================================================================
                   Cross-Border — Installation complete
============================================================================

  Panel URL:   http://YOUR_IP/f10585a9/?access_key=YOUR_KEY
  Login URL:   http://YOUR_IP/f10585a9/ui/login?access_key=YOUR_KEY
  Access key:  YOUR_KEY
  Username:    scraper_xxxxx
  Password:    ...

  Save this card — credentials are not shown again.
```

Bookmark the **Panel URL**. For logs path and update commands:

```bash
CROSSBORDER_INSTALL_VERBOSE=1 curl -fsSL .../install.sh | bash
```

### 6. Verify

On the server:

```bash
curl -s http://127.0.0.1:8787/health
crossborder service status
```

From your PC (nginx on 80):

```bash
curl -sI http://YOUR_VPS_IP/health
```

Open the **Access URL** in your browser.

### 7. HTTPS (optional, requires domain)

```bash
cd ~/crossborder-scraper
sudo bash scripts/deploy-https.sh panel.yourdomain.com
```

---

## Install profiles

| Profile | When | Path | Security entrance |
|---------|------|------|-------------------|
| **local** | Desktop | `~/crossborder-scraper` | Optional |
| **server** | VPS / public IP / SSH | `~/crossborder-scraper` | On |
| **wwwroot** | `/www/wwwroot` or `CROSSBORDER_VPS=1` | `/www/wwwroot/crossborder_scraper` | On |

**wwwroot:**

```bash
curl -fsSL .../install.sh | sudo env CROSSBORDER_VPS=1 bash
```

---

## nginx on port 80

| Method | Command |
|--------|---------|
| Install + configure | `CROSSBORDER_NGINX=1` on the install one-liner |
| Configure only | Re-run install when nginx is already installed |
| Skip | `CROSSBORDER_SKIP_NGINX=1` |
| Manual snippet | `crossborder deploy nginx -o deploy/nginx-panel.conf` |

Panel stays on **127.0.0.1:8787**; nginx proxies **80 → 8787**. Set `PANEL_PUBLIC_HTTP_PORT=80` in `.env` (server profile does this automatically).

---

## Re-run installer without losing data

When an existing install is detected, the script **asks for confirmation** before updating:

```text
  Current version:  0.1.2
  Target version:   0.1.3  (origin/main)

  Continue with update? [y/N]:
```

Type **`y`** to proceed. Credentials and data in `.env` / `data/` are kept.

**Non-interactive** (e.g. `curl | bash` on a server that already has Cross-Border):

```bash
CROSSBORDER_YES=1 curl -fsSL .../install.sh | bash
```

Or SSH in first and run interactively:

```bash
cd ~/crossborder-scraper
bash scripts/install.sh
```

When `~/crossborder-scraper/.git` exists, the installer **updates in place**.

### Kept

| Item | Kept? |
|------|-------|
| `.env` username / password | Yes |
| `PANEL_ENTRY_PATH` / `PANEL_ACCESS_KEY` | Yes |
| `data/`, `config/`, scrape output | Yes |

### Changed

| Item | Behavior |
|------|----------|
| Code | `git pull` / reset to origin |
| Dependencies | `uv sync` |
| Web UI | Rebuilt |
| Panel | **Restarted** on update |

### Recommended update

```bash
cd ~/crossborder-scraper
crossborder tools update
```

### Full re-install

```bash
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
```

### Backup (optional)

```bash
cd ~/crossborder-scraper
cp .env .env.backup.$(date +%Y%m%d)
tar czf ~/crossborder-backup-$(date +%Y%m%d).tar.gz .env config/ data/
```

---

## Daily operations

```bash
crossborder service status
crossborder service restart
crossborder tools update
crossborder deploy status
tail -f ~/crossborder-scraper/data/panel.log
```

---

## Security entrance

| URL | Result |
|-----|--------|
| `http://IP/ui/login` | **404** |
| `http://IP/{entry}/?access_key=KEY` | Cookie → login |
| `http://IP/{entry}/ui/login?access_key=KEY` | Login page |

```bash
grep -E '^PANEL_(ENTRY_PATH|ACCESS_KEY)=' ~/crossborder-scraper/.env
```

Enable or rotate via panel **Settings → Network** or the gateway agent (`setup_panel_security_entrance`).

---

## Troubleshooting

### Git “dubious ownership” on `/www/wwwroot`

The repo was created by `root` but you are installing as `ubuntu`. Fix ownership, then re-run install:

```bash
sudo chown -R ubuntu:ubuntu /www/wwwroot/crossborder_scraper
bash scripts/install.sh
```

Or register the path with git (no chown):

```bash
git config --global --add safe.directory /www/wwwroot/crossborder_scraper
```

**Avoid wwwroot auto-detect** — install to home dir instead:

```bash
curl -fsSL .../install.sh | env CROSSBORDER_HOME_INSTALL=1 bash
```

### Cannot connect from browser

```bash
curl -sI http://127.0.0.1:8787/health   # on server
ss -tln | grep 8787
```

1. Cloud security group — TCP **80** or **8787**
2. Host firewall — `crossborder deploy firewall`
3. `.env` — `PANEL_HOST=0.0.0.0`

### 502 Bad Gateway (nginx)

Panel not running:

```bash
crossborder service start
curl -s http://127.0.0.1:8787/health
```

### Login page blank / assets 404

With security entrance, assets load from `/ui/assets/…`. Update and restart:

```bash
crossborder tools update
crossborder service restart
```

### Panel not responding

```bash
tail -50 ~/crossborder-scraper/data/panel.log
crossborder service restart
```

---

## Environment variables

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_BRANCH` | Git branch or tag |
| `CROSSBORDER_INSTALL_DIR` | Custom install path |
| `CROSSBORDER_PORT` | Panel port (default **8787**) |
| `CROSSBORDER_NGINX=1` | Install nginx + HTTP proxy on 80 |
| `CROSSBORDER_SKIP_NGINX=1` | Skip nginx setup |
| `CROSSBORDER_VPS=1` | wwwroot layout + security entrance |
| `CROSSBORDER_YES=1` | Skip reinstall confirmation (non-interactive) |
| `CROSSBORDER_KEEP_LOCAL=1` | Keep local git commits on re-run |
| `CROSSBORDER_START=0` | Do not auto-start panel |
| `CROSSBORDER_SKIP_BROWSER=1` | Skip Playwright |
| `CROSSBORDER_SKIP_FIREWALL=1` | Skip auto ufw |
| `PANEL_SECURITY_ENTRANCE=1` | Secret path + access key |

Full list: `CROSSBORDER_HELP=1 curl -fsSL …/install.sh | bash`

---

## Security checklist

- Save the install access card.
- Change password: `crossborder tools reset credentials`
- Use HTTPS when you have a domain.
- Keep `.env` out of git.

---

## Related docs

| Doc | Contents |
|-----|----------|
| [SELF_HOSTING.md](SELF_HOSTING.md) | Full self-host reference, Docker |
| [DIRECTORY_LAYOUT.md](DIRECTORY_LAYOUT.md) | Install paths |
| [CLI.md](CLI.md) | Commands |
| [QUICK_START.md](QUICK_START.md) | First scrape |
