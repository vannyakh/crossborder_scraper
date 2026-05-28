# Gateway agent LLM

Connect a **provider and model** for Agent chat, cron schedules, and Telegram. Open **Settings → Agent LLM** for the setup workflow checklist and gateway capability links.

## Setup workflow (Settings → Agent LLM)

1. **Choose provider and model** — presets from the gateway; models load from the provider API.
2. **Add API key or local endpoint** — Ollama at `http://127.0.0.1:11434/v1` usually needs no key.
3. **Test connection** — probe draft or saved settings before enabling.
4. **Enable gateway agent LLM** — required for chat, cron, and integrate channels.
5. **Skills (optional)** — install SKILL.md packages to scope tools and instructions.
6. **Agent ready** — chat, cron jobs, and Telegram share this model.

## Use the agent

| Capability | Panel path |
|------------|------------|
| Chat | Agent → Chat |
| Cron jobs | Agent → Schedules |
| Skills | Agent → Skills |
| Tool catalog | Debug → Tool catalog |
| Pipelines | Agent → Pipelines |

## Tips

- One LLM connection powers chat, scheduled jobs, and integrate channels.
- Scrape extraction uses separate engine toggles elsewhere in the panel.
