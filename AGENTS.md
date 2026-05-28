# Agent guide — Cross-Border

This file orients **Cursor / coding agents** on how the repo is organized and how to add features safely at scale.

> **Not the same as gateway agent rules** (`libs/agent_rules/`, `config/agent_rules.yaml`) — those control the **panel AI at runtime**. This guide is for **development in the IDE**.

## What this project is

**Cross-Border** is a **self-hosted AI agent hub** — not a scrape-only CLI.

One **FastAPI gateway** is the orchestration boundary. It serves:

- React **agent panel** (`/ui/`) — chat, skills, cron, integrate, health, scrape workflows
- **CLI** — local ops + remote gateway client
- **Integrate channels** — Telegram (live), Discord, Slack, Email — same agent as web chat
- **Scrape & data pipeline** — engine, plugins, catalog, marketplace export (via agent tools + skills)

```
                    ┌─────────────────────────────────────┐
                    │         Gateway (FastAPI)            │
                    │  agent · tools · skills · schedules  │
                    │  integrate · scrape · export         │
                    └───────────┬─────────────┬───────────┘
                                │             │
              ┌─────────────────┼─────────────┼─────────────────┐
              ▼                 ▼             ▼                 ▼
         Web panel          CLI            Telegram          Cron agent
         /ui/agent/*     crossborder      integrate runner   schedules
```

### Repo map

```
apps/web/          React agent panel (Vite, Chakra, React Query)
src/server/        FastAPI routers → services → schemas
src/gateway/       Agent runtime, tools, skills, schedules, integrate runners
src/core/          Scrape engine, plugins, AI extraction, product store
src/deploy/        VPS install, firewall, store drivers
skills/            Built-in SKILL.md packages (runtime agent playbooks)
libs/agent_rules/  Runtime behavior policies for panel agent
libs/prompts/      System prompts (gateway_agent, telegram_agent, …)
config/            Runtime JSON/YAML on disk (not src/config/)
.cursor/rules/     IDE agent guidance (this doc + .mdc rules)
```

Deep dives: [ARCHITECTURE.md](ARCHITECTURE.md), [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## Two agent systems (do not mix)

| System | Who uses it | Location |
|--------|-------------|----------|
| **Cursor / IDE agent** | Developers editing this repo | `.cursor/rules/`, `AGENTS.md` |
| **Gateway agent** | Operators in panel chat, Telegram, cron | `src/gateway/`, `skills/`, `libs/agent_rules/` |

When adding **user-facing AI behavior**, change gateway code — not Cursor rules.

## Gateway agent flow (runtime)

Understanding this flow prevents putting logic in the wrong layer:

```
User message (web chat / Telegram / cron)
    → session + channel context (chat_sessions.py, integrate runners)
    → compose prompt: base prompt + enabled skills + agent rules
    → agent_runtime: LLM tool loop (tools.py handlers)
    → services / scrape engine / deploy helpers
    → grounded reply (ok: true from tools only)
```

| Piece | Path | Role |
|-------|------|------|
| Tools | `src/gateway/tools.py` | Callable functions (`scrape_product`, `create_schedule`, …) |
| Skills | `skills/*/SKILL.md` | Playbooks that scope tools + instructions per task domain |
| Rules | `libs/agent_rules/*.md` | Short policies injected into system prompt |
| Prompts | `libs/prompts/*.md` | Base persona (`gateway_agent`, `telegram_agent`) |
| Schedules | `src/gateway/scheduler.py` | Cron → agent message → optional Telegram notify |
| Integrate | `src/gateway/integrate/runners/<channel>/` | Platform bots → same agent runtime |

### Built-in skills

| Skill | Category | Tools (summary) |
|-------|----------|-----------------|
| `scrape-assistant` | scrape | `scrape_product`, `list_products`, `runtime_status` |
| `batch-ops` | scrape | `submit_batch`, `runtime_status`, `list_products` |
| `catalog-monitor` | catalog | `list_products`, `runtime_status` |
| `export-review` | export | `export_listing`, `list_products`, `list_marketplaces` |
| `agent-control` | gateway | schedules, integrate channels, `runtime_status` |
| `panel-ops` | panel | network/firewall, health, `list_agent_rules` |

Enable list: `config/agent_skills.yaml` or `src/gateway/skills/manager.py` defaults.

## Golden rules

1. **Gateway is the boundary** — automation belongs in `src/gateway/` (tools, workflows, integrate) or `src/server/services/`, not duplicated in the UI.
2. **Agent-visible ops need tools** — if the panel agent should do it, add or extend a tool in `tools.py`; optional skill documents the workflow.
3. **Thin routers** — HTTP handlers delegate to services; Pydantic models in `src/server/schemas/`.
4. **Single route source (web)** — `apps/web/src/routes/route-config.ts`; never orphan paths.
5. **Minimal diffs** — match existing naming, imports, and file layout.
6. **Product language** — [.cursor/rules/crossborder-product.mdc](.cursor/rules/crossborder-product.mdc).

## Vertical slices

### Panel feature (full stack)

schema → service → router → (optional gateway tool) → hooks → page → route-config

See [.cursor/rules/scalable-features.mdc](.cursor/rules/scalable-features.mdc).

### Gateway agent capability

When operators should **ask the agent** to do something new:

1. **Tool** — handler + `TOOL_DEFINITIONS` + `TOOL_HANDLERS` in `src/gateway/tools.py`
2. **Service** — business logic stays in `src/server/services/`; tool calls service
3. **Skill** (if non-obvious workflow) — `skills/<id>/SKILL.md` with `metadata.crossborder.tools`
4. **Default enable** — add id to `_BUILTIN_DEFAULT_ENABLED` in `skills/manager.py`
5. **Rule** (if policy) — short `libs/agent_rules/*.md` entry if grounding/safety needed
6. **Prompt** — only if persona/channel-specific; prefer skills over bloating base prompt
7. **Integrate** — Telegram runner under `integrate/runners/telegram/` if chat UX changes
8. **Tests** — `tests/test_gateway_*.py`, `tests/test_telegram_*.py` as appropriate

### Integrate channel feature

1. Catalog fields — `src/gateway/integrate/catalog.py`
2. Runner — `src/gateway/integrate/runners/<channel>/`
3. Panel page — `apps/web/src/pages/integrate/` + route-config
4. Gateway tools — `list_integrate_channels`, `configure_integrate_channel`, `reload_integrate_channel`

## Common domains (where to look)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Agent chat | `gateway/agent_runtime.py`, `services/gateway_service.py` | `/agent/chat` |
| Skills | `gateway/skills/`, `skills/` | `/agent/skills` |
| Cron schedules | `gateway/scheduler.py`, `schedules_store.py` | `/agent/schedules` |
| Integrate / Telegram | `gateway/integrate/runners/telegram/` | `/integrate/*` |
| Scrape jobs | `routers/jobs.py`, `core/engine/` | `/workflow/batches` |
| App Store / infra | `server/app_store/`, `deploy/drivers/` | `/store`, `/databases` |
| Panel security | `services/panel_security.py`, `deploy/` | Settings → Network, `/firewall` |
| Source plugins | `core/plugins/`, `plugins/` | App Store catalog |

## Imports and paths

**Python** — run from repo root; `from core.paths import repo_root`; flat imports `from server.services.foo import get_foo`.

**Web** — `apps/web/src/lib/api/client.ts` + `withPanelPrefix()`; nav from `route-config.ts`.

## Verify

```bash
make check          # import smoke
make check-ci       # ruff src + smoke + pytest
cd apps/web && pnpm build
```

## CLI agent control

Operators can run the full agent hub without the web UI:

```bash
crossborder service start       # background panel
crossborder gateway             # status
crossborder chat                # interactive agent
crossborder agent "instruction" # one-shot
crossborder skills list
crossborder schedules list
crossborder integrate list
crossborder discover tools
crossborder rules list --local
```

See [docs/CLI.md](docs/CLI.md).

Restart API after router/gateway changes. Restart Vite after `vite.config.ts` proxy changes.

## When unsure

- Mirror the nearest feature: Telegram integrate, firewall, skills, schedules.
- Prefer registry/catalog data over one-off strings.
- Ship vertical slices (API + minimal UI + tool if agent-facing) before large refactors.
