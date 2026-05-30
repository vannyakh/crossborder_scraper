---
name: vps-access
description: >-
  Self-host VPS install, nginx reverse proxy, HTTPS (deploy-https), and public
  panel access troubleshooting. Use when editing install/deploy scripts, fixing
  unreachable panel URLs, cloud security groups, ufw, nginx, certbot, or
  docs/SELF_HOSTING.md.
---

# VPS and panel access (Cursor)

Cross-Border self-host flow: **install → panel on :8787 → optional nginx → public URL**.

> **Gateway mirror:** runtime panel agent uses `libs/agent_rules/vps-access.md` (same policies, operator-facing).

## Repo map (deploy vertical slice)

| Area | Path |
|------|------|
| One-liner install | `scripts/install.sh`, `scripts/install-vps.sh` |
| HTTPS helper | `scripts/deploy-https.sh` |
| nginx + certbot | `src/deploy/nginx_setup.py` |
| nginx template | `src/deploy/templates.py` → `nginx_site()` |
| Network / ufw / cloud hints | `src/deploy/network_access.py` |
| CLI | `src/cli/commands/deploy_cmds.py` (`deploy https`, `setup-access`, `firewall`) |
| Docs | `docs/SELF_HOSTING.md` |
| Gateway tools | `src/gateway/tools.py` (`network_access_status`, `setup_network_access`, `apply_panel_firewall`) |
| Gateway skill | `skills/panel-ops/SKILL.md` |

## Access layers (diagnose in order)

1. **Panel bind** — `PANEL_HOST=0.0.0.0` in `.env`; listener on panel port (default **8787**).
2. **Host firewall** — ufw/firewalld allows **8787** and/or **80**/**443** when nginx fronts the panel.
3. **Cloud security group** — inbound TCP in the provider console (common miss: ufw open, cloud still blocks).

On server: `ss -tlnp | grep 8787`, `sudo ufw status`, curl `127.0.0.1:8787/health`.

From dev machine: `curl --connect-timeout 5 http://<eip>/health` (port 80 if nginx) and `:8787` if direct.

## Public access patterns

| Goal | Approach |
|------|----------|
| **Domain + HTTPS** | `sudo bash scripts/deploy-https.sh panel.example.com` or `crossborder deploy https -n …` — nginx **443**, panel on **127.0.0.1:8787**. Needs DNS A record + SG **80** + **443**. |
| **Public IP only** | nginx on **80** proxy to panel — `http://<eip>/ui/login`. No Let's Encrypt on bare IP. |
| **Direct panel port** | `http://<eip>:8787/ui/login` — only if host + cloud SG allow **8787**. |

## Install profiles (`scripts/install.sh`)

- **Default:** `~/crossborder-scraper`
- **wwwroot:** auto when `/www/wwwroot` exists, or `CROSSBORDER_VPS=1` → `/www/wwwroot/crossborder_scraper/`
- After piped `curl | bash`, script re-execs from cloned repo (`CROSSBORDER_INSTALL_REEXEC`) so CDN stale raw scripts are avoided

## Common fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Works on server, timeout from PC | Cloud SG | Open TCP **80**/**443** or **8787** in cloud console |
| `/health` OK, `/ui/login` 503 | Stale/missing web build | `cd apps/web && pnpm build`, restart panel |
| certbot fails | DNS or port 80 blocked | Verify `dig +short domain` → EIP; SG allows **80** |
| `sudo crossborder` not found | sudo drops user PATH | Use `sudo bash scripts/deploy-https.sh …` or `sudo env HOME=$HOME …/.venv/bin/crossborder` |

## When changing deploy behavior

- **Operator-facing** changes need gateway tools + optional updates to `libs/agent_rules/vps-access.md` and `skills/panel-ops/SKILL.md`.
- **Product language:** Cross-Border panel, cloud security group, host firewall, VPS — no other hosting panel product names.
- Match existing patterns in `nginx_setup.py` and `network_access.py`; keep diffs minimal.

## SSH to customer VPS (when credentials provided)

- Verify locally first: `curl 127.0.0.1:8787/health` on server
- `git pull` before running deploy scripts
- Rebuild UI if needed: `pnpm build` in `apps/web/`
- Do not echo or commit passwords from chat
