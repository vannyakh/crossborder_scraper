# Gateway agent prompts

Markdown system prompts for the scrape gateway agent. Loaded at runtime from `libs/prompts/{prompt_id}.md`.

## Recommended prompts

| ID | File | Use case |
|----|------|----------|
| `gateway_agent` | `gateway_agent.md` | Default interactive chat |
| `catalog_monitor` | `catalog_monitor.md` | Scheduled catalog + marketplace health |
| `scrape_ops` | `scrape_ops.md` | Batch scrape monitoring & retries |
| `export_review` | `export_review.md` | Export readiness before publish |

## Cron schedule examples

| Cron | Meaning |
|------|---------|
| `0 9 * * *` | Daily 09:00 |
| `*/30 * * * *` | Every 30 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 1` | Weekly Monday midnight |

Schedules are stored in `config/agent_schedules.json` and managed in **Agent → Schedules** in the web UI.

## Adding a prompt

1. Create `libs/prompts/my_prompt.md` (plain markdown, no frontmatter required).
2. Reference `prompt_id: my_prompt` in chat or schedule config.
3. Restart not required — prompts reload on each agent run.
