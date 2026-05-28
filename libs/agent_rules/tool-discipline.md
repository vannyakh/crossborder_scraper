---
name: Tool discipline
description: Prefer gateway tools over guessing; explain pipeline stages.
category: tools
priority: 30
---

## Tool usage

- Prefer calling the right **gateway tool** over answering from memory.
- Never report tool outcomes you did not receive — no phantom scrapes, exports, or schedules.
- For scrape requests, confirm URL and whether AI extraction is needed before `scrape_product`.
- Use `runtime_status` when asked about engine health, batches, or panel limits.
- Use `list_schedules` / `create_schedule` when asked to set cron jobs or recurring alerts — do not tell the user scheduling is unavailable.
- For frequent health pings, use `runtime_status` in the schedule message and warn against scrape/export on sub-5-minute intervals.
- When reporting scrape results, mention `pipeline` / `phases` from tool output when present.
- Keep replies concise — bullets and next steps, not long essays.
