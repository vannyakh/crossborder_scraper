---
name: add-project-template
description: Create or extend a Cross-Border project flow template in libs/project_templates/. Use when the user asks to add a new workflow template, create a pipeline template, build a new flow preset, or says "new template for..." — reads the rule, picks the right node kinds, places nodes on the canvas grid, and validates edge references before finishing.
---

# Add project flow template

## Step 1 — Read the rule

Read `.cursor/rules/project-templates.mdc` for the full JSON schema, node kinds, canvas layout conventions, and the validation script. Follow it exactly.

## Step 2 — Understand the request

Identify:
- **Trigger**: `schedule` (cron) or `webhook` (HTTP)
- **Core action nodes**: scrape, agent, export, postgres, redis, notify, condition, etc.
- **Notification channels**: Telegram `notify` for success and/or failure
- **Category**: `scrape` / `agent` / `data` / `infra` / `general`

If any detail is ambiguous, pick the most common default (e.g., daily schedule `"0 8 * * *"`, Telegram notify).

## Step 3 — Lay out the canvas

Start at `x: 60, y: 220`. Advance `+240` on x for each sequential node.

For branches after a `condition` node:
- Success path: same x column, `y - 110` (above)
- Failure / alt path: same x column, `y + 110` (below)

Add a `sticky` note below the flow (`y + 200`) for user configuration hints.

## Step 4 — Write the JSON file

File: `libs/project_templates/<kebab-id>.json`

Required top-level fields:

```json
{
  "id": "kebab-case-id",
  "name": "Template display name",
  "summary": "One sentence",
  "description": "Two to three sentences explaining the use case.",
  "category": "scrape|agent|data|infra|general",
  "category_label": "Scrape pipeline|Agent automation|Data pipeline|Infrastructure|General",
  "tags": ["tag1"],
  "author": "Cross-Border",
  "featured": false,
  "nodes": [],
  "edges": []
}
```

Match existing templates for reference: `libs/project_templates/1688-ecommerce-full.json`.

## Step 5 — Validate

Run the validation script from the rule:

```bash
python -c "
import json, pathlib, sys
for f in pathlib.Path('libs/project_templates').glob('*.json'):
    d = json.loads(f.read_text())
    ids = {n['id'] for n in d.get('nodes',[])}
    for e in d.get('edges',[]):
        assert e['from'] in ids, f'{f.name}: bad edge from {e[\"from\"]}'
        assert e['to'] in ids, f'{f.name}: bad edge to {e[\"to\"]}'
    print('OK', f.name)
"
```

All templates must print `OK`. Fix any `bad edge` errors before finishing.

## Step 6 — Report to user

Tell the user:
- File path created
- Node count + edge count
- Any fields that still need operator configuration (DB credentials, Telegram channel ID, cron, plugin, etc.)
