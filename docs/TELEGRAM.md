# Telegram control chat (gateway agent)

**channel adapter**: messages in Telegram run the same gateway agent as the web panel (`POST /gateway/agent/run`).

## 1. Create a bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`, follow prompts, copy the **bot token**.

## 2. Configure

Edit `config/ui_config.json` (or use the API / panel when UI is wired):

```json
"telegram": {
  "enabled": true,
  "bot_token": "123456:ABC…",
  "control_chat_ids": [-1001234567890],
  "allow_any_chat": false,
  "prompt_id": "gateway_agent",
  "max_reply_chars": 3500
}
```

| Field | Purpose |
|-------|---------|
| `enabled` | Start long-polling when the panel server runs |
| `bot_token` | From BotFather (or set `TELEGRAM_BOT_TOKEN` in `.env`) |
| `control_chat_ids` | Numeric chat IDs allowed to run the agent |
| `allow_any_chat` | If `true`, any chat can use the bot (not recommended) |
| `prompt_id` | Gateway prompt template (`gateway_agent`, etc.) |

### Find your chat ID

1. Set `enabled: true` and `bot_token`, restart the panel.
2. Message your bot `/start` from the chat you want to control.
3. The bot replies with `Your chat id: \`…\``.
4. Add that number to `control_chat_ids` and restart (or `PATCH /gateway/telegram`).

## 3. Run the panel

```bash
uv run crossborder serve --no-reload
```

The bot starts automatically when `telegram.enabled` is true and a token is set.

## Web UI

Open **Integrate → Telegram** (`/ui/integrate/telegram`) to enable the bot, set the token, allowed chat IDs, prompt, and save. The dashboard **Automation** section also links here.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/gateway/telegram` | Current config (token masked) |
| `PATCH` | `/gateway/telegram` | Update config and reload the bot |

## CLI

```bash
uv run crossborder channels telegram          # via running API
uv run crossborder channels telegram --local  # read ui_config.json only
```

## Requirements

- `ai_agent_enabled` and `ai_api_key` must be set in panel config for agent replies.
- Install deps: `uv sync` (includes `python-telegram-bot`).
