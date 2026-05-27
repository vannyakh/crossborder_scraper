# Plugin marketplace (`server/store`)

Docker / external **infrastructure plugins** (Redis, Postgres, RabbitMQ, …): catalog, install, probes.

Not to be confused with:

- `pipeline/storage.py` — scraped **product** SQLite
- `server/stores/` — service **audit logs**
- `installed_plugins/` — sandboxed **scrape** ZIP plugins

Source/site scrapers are registered via `core.plugins` and exposed in the same App Store UI.
