# FastAPI gateway host (`server/`)

Single control plane for the panel, CLI, and AI agent. Business logic lives in **services**; HTTP wiring in **routers**.

## Layers

```
app.py              # FastAPI factory + UI mount
bootstrap.py        # Lifespan: credentials, scheduler, telegram
api/registry.py     # Route registration (grouped by domain)
deps.py             # → core.deps (protected_router)
manager.py          # → services.facade (legacy ScrapeManager)

core/               # Cross-cutting (no HTTP)
  auth.py           # Panel Basic auth + WebSocket
  deps.py           # protected_router dependency
  constants.py      # APP_VERSION, SERVICE_STARTED_AT
  events.py         # Batch SSE / WebSocket bus
  panel_bind.py     # Bind host/port for panel access URLs

routers/            # Thin HTTP handlers → services
services/           # Domain logic + singleton getters
  context.py        # AppContext (settings, store, cookies)
  facade.py         # ScrapeManager for gateway/CLI
  product.py        # Single-URL scrape
  batch.py          # Concurrent batches + SSE
  engine.py         # Warm Playwright pool
  config.py         # Panel / AI JSON config
  export.py         # Marketplace export
  gateway_service.py
  runtime.py, audit.py, ...

schemas/            # Pydantic request/response models (by domain)
app_store/          # App Store: Docker infra plugins (Redis, etc.)
audit/              # Panel audit logs (operation / run / cron)
infra/              # SPA static files, Vite dev proxy
```

## Naming (avoid confusion)

| Path | Role |
|------|------|
| `server/app_store/` | **Infrastructure** marketplace (Docker services); API prefix `/store` |
| `server/audit/` | **Audit logs** JSONL |
| `pipeline/storage.py` | Scraped **products** SQLite |
| `installed_plugins/` | User **scrape** ZIP plugins |
| `core.plugins` | Built-in **source** scrapers |

## Adding an endpoint

1. Model in `schemas/<domain>.py`
2. Logic in `services/<name>.py` with `get_*_service()`
3. Route in `routers/<name>.py` using `protected_router`
4. Register in `api/registry.py`

## Entry

`uv run serve` → `server.__main__` → `server.app:app`
