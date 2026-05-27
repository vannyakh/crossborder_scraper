# Local development

## API

```bash
uv run serve
bash scripts/serve-api.sh   # with reload
```

Default port comes from `PANEL_PORT` in `.env` (8787 in `.env.example`, often 8000 locally).

## React panel (Vite)

```bash
bash scripts/dev-ui.sh
```

Or manually:

```bash
cd apps/web
pnpm install
pnpm dev
```

Vite reads `PANEL_PORT` from the repo root `.env` and proxies `/health`, `/jobs`, etc. to the API. On startup you should see:

```text
[vite] API proxy → http://127.0.0.1:8000
```

**502 on `/health`:** the Vite proxy port does not match the running API — align `PANEL_PORT` in `.env` and restart both processes.

Production UI: `pnpm build` in `apps/web`, then served by the API at `http://localhost:<PANEL_PORT>/ui/`.

## Docker

```bash
docker compose up --build
```

## CI

Lint, web build, and Docker smoke tests run on push/PR to `main`. Release workflow runs on `v*` tags. See [.github/RELEASE.md](../.github/RELEASE.md).
