# Python source (`src/`)

Installable packages live here as **flat top-level names** (`server`, `core`, `cli`, …) — see [docs/PROJECT_STRUCTURE.md](../docs/PROJECT_STRUCTURE.md).

| Package | Role |
|---------|------|
| `cli` | Typer CLI |
| `config` | Settings & credentials |
| `core` | Scrape engine, shared models |
| `core/plugins` | Source plugin framework (spec, sandbox, manager) |
| `sites` | Built-in marketplace scrapers |
| `plugins` | Built-in social/custom source plugins |
| `pipeline` | Normalize + SQLite storage |
| `export` | Marketplace exporters |
| `gateway` | AI agent, tools, workflows |
| `server` | FastAPI panel API |
