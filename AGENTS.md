# Agent guide — Cross-Border

This file orients **Cursor / coding agents** on how the repo is organized and how to add features safely at scale.

> **Not the same as gateway agent rules** (`libs/agent_rules/`, `config/agent_rules.yaml`) — those control the **panel AI at runtime**. This guide is for **development in the IDE**.

## What this project is

**Cross-Border** — scrape 1688/Taobao/AliExpress (and plugins), normalize products, export to marketplaces. One **FastAPI gateway** serves the React **panel** (`/ui/`), CLI, and gateway agent tools.

```
apps/web/     React panel (Vite, Chakra, React Query)
src/server/   FastAPI routers → services → schemas
src/gateway/  Agent tools, workflows, scheduler (control plane)
src/core/     Scrape engine, plugins, paths, AI
src/deploy/   VPS install scripts, drivers, firewall helpers
config/       Runtime YAML/JSON on disk (not src/config/)
libs/         Prompts, store driver scripts, agent_rules
```

Deep dives: [ARCHITECTURE.md](ARCHITECTURE.md), [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## Golden rules

1. **Gateway is the boundary** — new automation belongs in `src/gateway/` tools/workflows or `src/server/services/`, not duplicate logic in the UI.
2. **Thin routers** — HTTP handlers in `src/server/routers/` delegate to services; Pydantic models in `src/server/schemas/`.
3. **Single route source (web)** — paths, nav, breadcrumbs: `apps/web/src/routes/route-config.ts`. Do not hardcode paths in multiple files.
4. **Minimal diffs** — match existing naming, imports, and file layout; no drive-by refactors.
5. **Product language** — follow [.cursor/rules/crossborder-product.mdc](.cursor/rules/crossborder-product.mdc) (panel, VPS, host firewall — no vendor panel names).

## Adding a panel feature (full stack checklist)

Use when adding a new tool page, settings section, or API surface.

### Backend

| Step | Location |
|------|----------|
| Pydantic models | `src/server/schemas/<domain>.py` + export in `schemas/__init__.py` `__all__` |
| Business logic | `src/server/services/<name>.py` (singleton `get_*()` pattern) |
| HTTP routes | `src/server/routers/<name>.py` using `protected_router(prefix="/…")` |
| Register router | `src/server/api/registry.py` |
| Host scripts (optional) | `src/deploy/` or `libs/store_drivers/<id>/` |
| Gateway tool (optional) | `src/gateway/tools.py` — for agent-visible operations |

### Frontend

| Step | Location |
|------|----------|
| API types | `apps/web/src/lib/api/types.ts` |
| React Query hooks | `apps/web/src/hooks/queries/use-*-query.ts` + `queryKeys` |
| Page | `apps/web/src/pages/*Page.tsx` |
| UI | `apps/web/src/components/<feature>/` |
| Router + nav + i18n | `route-config.ts`, `routes/index.tsx`, `locale/messages/{en,zh,km}.ts` |
| Dev proxy | `apps/web/vite.config.ts` → `API_PROXY_PATHS` if new top-level API prefix |
| Tools sidebar | `OPERATIONS_ROUTES` in `route-config.ts` when under **Tools** |

### Verify

```bash
make check          # import smoke
make check-ci       # ruff src + smoke
cd apps/web && pnpm build
```

Restart API after router changes. Restart Vite after `vite.config.ts` proxy changes.

## Common domains (where to look)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Scrape jobs | `routers/jobs.py`, `services/` | `/workflow/batches` |
| App Store / infra | `server/app_store/`, `/store` | `/store`, `/databases` |
| Gateway agent | `routers/gateway.py`, `gateway/tools.py` | `/agent/*` |
| Integrate channels | `gateway/channels/` | `/integrate/*` |
| Panel security | `services/panel_security.py`, `deploy/` | Settings → Network, `/firewall` |
| Docker host | `services/docker_host.py`, `/docker` | `/docker` |
| Source plugins | `core/plugins/`, `plugins/` | App Store catalog |

## Imports and paths (Python)

- Run commands from **repo root**.
- Prefer `from core.paths import repo_root, config_dir, data_dir` over `Path(__file__).parents[N]`.
- Flat package imports: `from server.services.foo import get_foo`, `from deploy.drivers import …`.

## Imports and paths (Web)

- API client: `apps/web/src/lib/api/client.ts` + `withPanelPrefix()`.
- Nav: `apps/web/src/config/nav.ts` builds from `route-config.ts` — always provide i18n `labelKey`s.

## When unsure

- Read the nearest existing feature (e.g. firewall, docker, store) and mirror its layers.
- Prefer extending registry/catalog data over one-off strings.
- Ask before large cross-cutting refactors; ship vertical slices (API + minimal UI) first.
