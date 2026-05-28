---
name: agent-control
description: "Manage cron schedules, integrate channels, and gateway automation from chat."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🎛️"
    category: gateway
    tools:
      - list_schedules
      - create_schedule
      - update_schedule
      - delete_schedule
      - run_schedule
      - list_integrate_channels
      - configure_integrate_channel
      - reload_integrate_channel
      - runtime_status
      - list_agent_rules
---

# Agent control

Use when the user asks to **schedule jobs**, **set up alerts**, or **configure integrate channels** from chat or Telegram.

## Cron schedules

1. `list_schedules` — show existing jobs before creating duplicates.
2. `create_schedule` with:
   - **cron** — standard 5-field expression (`*/1 * * * *` = every minute)
   - **message** — what the agent should do each tick
   - **notify_telegram** — `true` to push the summary to allowed Telegram chats
3. Prefer **`runtime_status`** (or catalog checks) for frequent ticks — not scraping.
4. Warn if interval is under 5 minutes and the task is heavy (scrape/export).

### Example: 1-minute health alert

```
name: System health ping
cron: */1 * * * *
message: Call runtime_status and report engine health in 3 bullets. Flag running batches or AI off.
notify_telegram: true
prompt_id: gateway_agent
```

## Integrate channels

- `list_integrate_channels` before changing credentials.
- `configure_integrate_channel` for Telegram token, allowed chat ids, enable/disable.
- `reload_integrate_channel` after Telegram config changes.

## Safety

- Confirm destructive actions (delete schedule, disable channel).
- Do not store or repeat bot tokens in chat replies.
- If Telegram is not configured, say to set it under **Integrate → Telegram** first.
