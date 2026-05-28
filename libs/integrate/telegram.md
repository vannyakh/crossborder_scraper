# Telegram setup

Connect a **Telegram bot** so control chats run the same gateway agent as the web panel.

## Before you start

- Enable **AI & LLM** in Settings and set an API key — the agent needs a model to reply.
- Keep the panel server running while the bot polls for messages.

## 1. Create a bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow the prompts.
3. Copy the **bot token** (format `123456789:ABC…`).

## 2. Configure in the panel

| Field | Purpose |
|-------|---------|
| **Enable** | Start long-polling when the panel is running |
| **Bot token** | From BotFather, or set `TELEGRAM_BOT_TOKEN` in `.env` |
| **Allowed chat IDs** | Numeric IDs that may run the agent |
| **Allow any chat** | Opens the bot to every chat — not recommended for production |
| **Agent prompt** | Gateway role template (`gateway_agent`, etc.) |
| **Max reply length** | Truncate long agent replies (500–8000 chars) |

Save credentials — the runner reloads automatically.

## 3. Find your chat ID

1. Enable Telegram and save with a valid token.
2. Message your bot `/start` or `/getid` from the chat you want to control.
3. The bot replies with `Your chat id: …` (works before the chat is allowlisted).
4. Add that number to **Allowed chat IDs** and save again.

## 4. Use the agent

Send any text message in an allowed chat. The bot runs gateway tools (scrape, export, status) the same way as web chat.

### Useful bot commands

- `/start` — show chat id and setup steps (works before allowlist)
- `/getid` — chat id only (works before allowlist)
- `/help` — same as start
- `/status` — gateway version, tool count, schedules (allowlisted chats only)

## Script & API

```bash
uv run crossborder gateway channels configure telegram --enable \
  --json '{"bot_token":"YOUR_TOKEN","control_chat_ids":[123456789]}'
```

| Method | Path |
|--------|------|
| `GET` | `/gateway/channels/telegram` |
| `PATCH` | `/gateway/channels/telegram` |
| `POST` | `/gateway/channels/telegram/reload` |

Python:

```python
from gateway.integrate.setup import configure_channel, reload_channel
configure_channel("telegram", {"enabled": True, "bot_token": "…"})
```
