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

Vite probes `http://127.0.0.1:<port>/health` on startup and proxies API routes to the first match among **8000**, `PANEL_PORT` from `.env`, and **8787**. Override with `VITE_API_PORT` in `apps/web/.env.local` if needed.

On startup you should see:

```text
[vite] API proxy → http://127.0.0.1:8000 (auto-detected)
```

**502 on `/health`:** the API is not running, or nothing responds on those ports — start `uv run serve` (or uvicorn on 8000) and restart Vite.

Production UI: `pnpm build` in `apps/web`, then served by the API at `http://localhost:<PANEL_PORT>/ui/`.

## Docker

```bash
docker compose up --build
```

## CI

Lint, web build, and Docker smoke tests run on push/PR to `main`. Release workflow runs on `v*` tags. See [.github/RELEASE.md](../.github/RELEASE.md).
