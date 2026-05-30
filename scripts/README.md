# Scripts

Run from repository root (scripts resolve `ROOT` automatically).

| Script | Purpose |
|--------|---------|
| `install.sh` | **One-liner (Linux/macOS)** — local, LAN server, or cloud VPS; uv, Node, Playwright, panel UI, credentials, auto-start |
| `install.ps1` | **One-liner (Windows)** — same via PowerShell (`irm … \| iex`) |
| `setup.sh` | From clone: `uv sync`, Playwright, `crossborder setup` |
| `serve-api.sh` | FastAPI panel with reload (`uv run serve`) |
| `dev-ui.sh` | Vite dev server (`apps/web`, proxies API) |
| `dev-stack.sh` | Print dev / prod run + test instructions |
| `build.sh` | **`dev`** deps · **`prod`** panel bundle · **`docker`** / **`prod-docker`** images |
| `run.sh` | **`dev`** API · **`dev-ui`** Vite · **`prod`** static bundle · **`prod-docker`** compose |
| `test.sh` | **`dev`** pytest + smoke · **`prod`** build + HTTP smoke · **`prod-docker`** container |
| `smoke-http.sh` | Brief prod API run; checks `/health` and `/ui/` |
| `smoke-docker.sh` | Docker build (optional skip) + container health |
| `../Makefile` | `make build-dev`, `make run-prod`, `make test-prod` — [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) |

Environment:

- `PANEL_PORT` — API port (default `8787`)
- `UVICORN_RELOAD` — set `0` in prod run
- `SMOKE_PORT` — HTTP smoke port (default `9876`)
- `SMOKE_SKIP_BUILD=1` — reuse existing Docker tag in `smoke-docker.sh`

CLI:

```bash
crossborder --help
uv run crossborder serve
# alias: scraper
```
