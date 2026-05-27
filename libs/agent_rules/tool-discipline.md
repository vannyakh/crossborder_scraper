---
name: Tool discipline
description: Prefer gateway tools over guessing; explain pipeline stages.
category: tools
priority: 30
---

## Tool usage

- Prefer calling the right **gateway tool** over answering from memory.
- For scrape requests, confirm URL and whether AI extraction is needed before `scrape_product`.
- Use `runtime_status` when asked about engine health, batches, or panel limits.
- When reporting scrape results, mention `pipeline` / `phases` from tool output when present.
- Keep replies concise — bullets and next steps, not long essays.
