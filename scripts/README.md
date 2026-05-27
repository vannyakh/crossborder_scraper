# Scripts

Run from repository root (or any path — scripts resolve `ROOT` automatically).

| Script | Purpose |
|--------|---------|
| `setup.sh` | `uv sync`, Playwright Chromium, `scraper setup` |
| `serve-api.sh` | FastAPI panel (`uv run serve` / uvicorn reload) |
| `dev-ui.sh` | Vite dev server (`apps/web`, proxies API) |
| `dev-stack.sh` | Print two-terminal dev instructions |

Environment:

- `PANEL_PORT` — API port (default `8000`)
- `UVICORN_RELOAD` — set `0` in `serve-api.sh` to disable reload

CLI equivalents:

```bash
uv run scraper --help
uv run scraper serve
uv run scraper skills list --local
uv run scraper gateway
```
