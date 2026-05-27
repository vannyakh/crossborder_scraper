# Directory layout (self-host)

## Application root

Default VPS path:

```text
/www/wwwroot/crossborder_scraper/
```

This is the **git project root**: `src/`, `apps/web/`, `config/`, `.venv`, `.env`. Update it with `git pull` / `crossborder tools sync` — do not store uploads inside `src/`.

## Runtime data (`var/`)

On VPS installs (`CROSSBORDER_VPS=1` or `install-vps.sh`), all mutable state lives under **`var/`** so backups and permissions are simple:

| Path | Purpose |
|------|---------|
| `var/data/` | SQLite (`products.db`), cookies, scrape output, `panel.log` |
| `var/data/cookies/` | Playwright session cookies per site |
| `var/data/output/` | Exported JSON / scrape artifacts |
| `var/plugins/` | ZIP-installed **scrape** plugins (sandboxed) |
| `var/skills/` | ZIP-installed **agent** skills |
| `var/uploads/` | Panel file uploads (reserved) |
| `var/logs/` | Service audit log (`service_logs.jsonl`) |
| `var/data/store/` | Docker App Store plugin install metadata |

Panel settings stay in **`config/`** (`ui_config.json`, `plugins.yaml`, schedules) — editable from the UI.

## Legacy layout (dev clones)

If you installed before `var/` support, paths may still be:

- `data/`
- `installed_plugins/`
- `installed_skills/`

Both layouts work. New VPS installs use `var/` only.

## Environment

| Variable | Effect |
|----------|--------|
| `CROSSBORDER_INSTALL_DIR` | App root (default `~/crossborder-scraper` or `/www/wwwroot/crossborder_scraper`) |
| `CROSSBORDER_VAR_DIR` | Override entire runtime parent (instead of `./var`) |
| `CROSSBORDER_VAR_LAYOUT=1` | Force `var/` layout |
| `CROSSBORDER_VAR_LAYOUT=0` | Force legacy root layout |

## Recommended self-host flow

1. **Install** — `install-vps.sh` → app root + `var/` + panel on `0.0.0.0:8787`
2. **Backup** — tarball `var/` + `config/` + `.env` (not the whole `src/` tree)
3. **Update app** — `crossborder tools sync` (git + deps); restart panel
4. **HTTPS** — `crossborder deploy nginx` → reverse proxy on 443
5. **Plugins/skills** — upload ZIPs in the panel; files land in `var/plugins/` and `var/skills/`

## Permissions

Run the panel as user `crossborder` (created on root install) or your deploy user. Ensure that user owns `var/` and `config/`:

```bash
sudo chown -R crossborder:crossborder /www/wwwroot/crossborder_scraper/var
sudo chown -R crossborder:crossborder /www/wwwroot/crossborder_scraper/config
```
