# App Store — infrastructure plugins (`server/app_store/`)

Docker / external **infrastructure** (Redis, Postgres, RabbitMQ, …): catalog, install, probes.

HTTP routes stay under **`/store/*`** (`routers/store.py`).

Not to be confused with:

- `pipeline/storage.py` — scraped **product** SQLite
- `server/audit/` — panel **audit logs**
- `installed_plugins/` — sandboxed **scrape** ZIP plugins
- `core.plugins` — built-in **source** scrapers (same UI catalog, different code path)
