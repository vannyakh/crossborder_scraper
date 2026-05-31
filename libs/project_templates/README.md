# Community project flow templates

Reusable workflow graphs for the panel project canvas. Each file is a JSON document with metadata plus `nodes` and `edges` (same shape as `/projects/{id}` flow payloads).

## Layout

```
libs/project_templates/
  gateway-agent-starter.json
  scrape-to-export.json
  catalog-monitor.json
  batch-scrape-pipeline.json
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/projects/templates` | List community templates (optional `?category=`) |
| GET | `/projects/templates/{id}` | Template detail with full flow graph |
| POST | `/projects/templates/{id}/use` | Create a new project from the template |

## Add a template

1. Copy an existing JSON file and set a unique `id`.
2. Define `nodes` and `edges` using stable placeholder ids (e.g. `tpl-schedule-1`).
3. Restart the API — discovery is automatic via `server.projects.community.loader`.

When an operator uses a template, node and edge ids are regenerated so the new project is independent.

## Panel hooks

- `useProjectTemplatesQuery()` — list catalog
- `useProjectTemplateQuery(id)` — detail + preview graph
- `useProjectTemplateUseMutation()` — instantiate as project
