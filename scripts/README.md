# Scripts

Run from repository root (or any path — scripts resolve `ROOT` automatically).

| Script | Purpose |
|--------|---------|
| `install.sh` | **One-liner (Linux/macOS)** — clone or use repo, uv, Playwright, panel access card |
| `install.ps1` | **One-liner (Windows)** — same via PowerShell (`irm … \| iex`) |
| `setup.sh` | From clone: `uv sync`, Playwright, `scraper setup` (`SETUP_MODE=panel\|server\|docker`) |
| `setup.ps1` | Wrapper → `install.ps1` |
| `tools.sh` | **Maintenance** — `sync`, `update`, `restart`, `reset` (→ `scraper tools`) |
| `serve-api.sh` | FastAPI panel (`uv run serve` / uvicorn reload) |
| `dev-ui.sh` | Vite dev server (`apps/web`, proxies API) |
| `dev-stack.sh` | Print two-terminal dev instructions |
| `../Makefile` | `make fmt`, `make lint`, `make check`, `make test` — see [CONTRIBUTING.md](../CONTRIBUTING.md) |

Environment:

- `PANEL_PORT` — API port (default `8000`)
- `UVICORN_RELOAD` — set `0` in `serve-api.sh` to disable reload

CLI equivalents:

```bash
crossborder --help
uv run crossborder serve
uv run crossborder skills list --local
uv run crossborder gateway
# alias: scraper
```
