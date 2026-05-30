# Scripts

Run from repository root unless noted.

## Self-host install

| Script | Purpose |
|--------|---------|
| [`install.sh`](install.sh) | **One-liner (Linux/macOS)** — clone, deps, UI build, credentials, security entrance, auto-start |
| [`install-vps.sh`](install-vps.sh) | Wrapper — forces `/www/wwwroot` + security entrance |
| [`install.ps1`](install.ps1) | **One-liner (Windows)** — PowerShell |
| [`deploy-https.sh`](deploy-https.sh) | nginx + Let's Encrypt on a VPS (run with sudo) |

**Docs:** [docs/INSTALL.md](../docs/INSTALL.md) · [docs/SELF_HOSTING.md](../docs/SELF_HOSTING.md)

### Common install commands

```bash
# Standard (local, LAN, or cloud VPS)
curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash

# VPS with nginx on port 80
curl -fsSL .../install.sh | env CROSSBORDER_NGINX=1 bash

# wwwroot layout
curl -fsSL .../install.sh | sudo env CROSSBORDER_VPS=1 bash

# From clone
bash scripts/install.sh

# Help
CROSSBORDER_HELP=1 curl -fsSL .../install.sh | bash
```

### Install environment variables

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_BRANCH` | Git branch or tag |
| `CROSSBORDER_NGINX=1` | Install nginx + HTTP proxy on 80 |
| `CROSSBORDER_SKIP_NGINX=1` | Skip nginx setup |
| `CROSSBORDER_VPS=1` | `/www/wwwroot` layout |
| `CROSSBORDER_YES=1` | Skip reinstall confirmation |
| `CROSSBORDER_START=0` | Skip auto-start |

Re-run on an existing install updates code and **restarts** the panel; `.env` and `data/` are preserved. Prompts **`Continue with update? [y/N]`** unless `CROSSBORDER_YES=1`.

---

## Development

| Script | Purpose |
|--------|---------|
| `setup.sh` | From clone: `uv sync`, Playwright, `crossborder setup` |
| `serve-api.sh` | FastAPI panel with reload |
| `dev-ui.sh` | Vite dev server |
| `dev-stack.sh` | Dev / prod run instructions |
| `build.sh` | Dev deps · prod bundle · Docker images |
| `run.sh` | Dev API · prod static · Docker |
| `test.sh` | pytest + smoke |
| `smoke-http.sh` | Prod API `/health` + `/ui/` |
| `smoke-docker.sh` | Docker build + health |

See [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) and `make help`.

---

## CLI

```bash
crossborder service status
crossborder tools update
crossborder deploy https -n panel.example.com
```
