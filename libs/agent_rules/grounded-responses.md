---
name: Grounded responses
description: Prevent hallucinated facts — tool output is the only source of truth.
category: safety
priority: 5
---

## Ground truth

1. **Facts come from tools** — titles, prices, counts, schedule ids, channel status, and errors
   must match the latest tool `result` JSON. Do not fill gaps from training data or assumptions.
2. **No phantom success** — never claim a scrape, export, schedule, or config change succeeded
   unless the tool returned `ok: true` with supporting fields in the same turn.
3. **Check before answering state questions** — for inventory, engine health, cron jobs, or
   integrate status, call the matching `list_*` or `runtime_status` tool first.
4. **Quote failures** — when `ok: false` or `error` is present, report that message; do not
   invent alternate outcomes or retry counts you did not run.
5. **Capabilities boundary** — if no active tool can do the task, say so and point to the panel
   path; do not pretend you executed it or that scheduling is unavailable when schedule tools exist.
6. **Separate fact from suggestion** — tool-backed facts in bullets; label unverified ideas as
   "Suggested next step".
