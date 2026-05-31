# Project domain (`server/projects/`)

Persistence and helpers for the panel **flow canvas**. HTTP is split across thin routers; orchestration uses `ProjectService`.

## Architecture

```
routers/
  projects.py              # list, CRUD, flow PUT, presence
  project_settings.py      # settings, tokens
  project_observability.py # logs, runtime
  project_templates.py     # templates + plugin-profiles catalog (read-only)
  project_ws.py            # WebSocket collaboration

services/
  project_service.py              # Facade (flow + settings + observability)
  project_flow_service.py         # Flow graph CRUD
  project_settings_service.py     # Settings composition
  project_observability_service.py # Logs + runtime payload
  project_templates_service.py    # Community templates

projects/
  flow_store.py            # Flow graph JSON persistence
  settings_store.py        # Visibility, variables, tokens
  runtime_log_store.py     # Per-project runtime logs
  runtime_metrics_store.py # Host metrics samples
  derive.py                # Derived preview/services fields
  collaboration.py         # Canvas WebSocket hub
  plugin_profiles/         # Server-driven node config catalog
  community/               # Template loader + clone
```

Registry mounts `project_templates` before `projects` so `/projects/templates` is never captured by `/{project_id}`.

## Storage layout

```
data/projects/
  {id}.json              # Flow graph — nodes, edges, name, environment (no derived fields on disk)
  _settings/{id}.json      # Visibility, variables, members, tokens
  _runtime_logs/{id}.json
  _runtime_metrics/{id}.json
```

## Write paths (single owner each)

| Concern | Route | Store |
|---------|-------|-------|
| Flow graph | `PUT /projects/{id}/flow` | `{id}.json` |
| Metadata | `PATCH /projects/{id}` | `{id}.json` |
| Visibility & variables | `PATCH /projects/{id}/settings` | `_settings/` |
| Inferred variables | After flow save | `_settings/` |

## Derived fields

`derive.apply_derived_fields()` computes `preview_*` and `services_*` at read time. `flow_store.save_project()` strips them before write.

## Runtime metrics

`GET /projects/{id}/runtime` returns `simulated: true` — host psutil readings allocated across flow nodes, not per-service probes.

## Collaboration (Redis)

Set `CROSSBORDER_PROJECT_COLLAB_REDIS_URL` to enable cross-instance canvas sync via Redis pub/sub. Without it, collaboration stays in-process (single panel instance).

## Project API tokens

Project tokens authenticate `Authorization: Bearer <secret>` on `/projects/{id}/*` routes (except token management). Panel HTTP Basic auth still works for all routes. Token CRUD requires panel credentials.

## Dependencies

`projects/deps.require_project` — shared 404 guard for `/{project_id}/*` routes.

Gateway tools use `get_project_service()` for project runtime and settings, and
`get_project_templates_service()` for template list/use. Plugin profile catalog
covers flow node kinds (schedule, webhook, export, agent, notify, condition) in
addition to LLM/scraper profiles.
