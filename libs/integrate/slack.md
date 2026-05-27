# Slack setup

Save **Slack app credentials** for workspace channels that will drive the gateway agent.

## Before you start

- Create an app at [api.slack.com/apps](https://api.slack.com/apps).
- Enable **AI & LLM** in panel Settings for future agent replies.

## 1. Create a Slack app

1. **Create New App** → From scratch.
2. **OAuth & Permissions** → add Bot Token Scopes: `chat:write`, `channels:history`, `channels:read`.
3. **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-…`).
4. **Basic Information** → copy the **Signing Secret**.

### Optional: Socket Mode

For future socket-mode runner, create an **App-Level Token** (`xapp-…`) with `connections:write`.

## 2. Channel IDs

Right-click a channel → **View channel details** → copy the channel ID (`C…`).

Add allowed IDs to **Allowed channel IDs** in the panel.

## 3. Configure in the panel

| Field | Purpose |
|-------|---------|
| **Enable** | Mark channel active (runner coming soon) |
| **Bot token** | `xoxb-…` from OAuth install |
| **Signing secret** | Verifies incoming events |
| **App-level token** | Optional — socket mode |
| **Allowed channel IDs** | Channels that may trigger the agent |
| **Agent prompt** | Gateway role template |

## 4. Next steps

When the Slack runner ships, messages in allowed channels invoke the same tool catalog as web chat and Telegram.

## Script & API

```bash
uv run crossborder gateway channels configure slack \
  --json '{"bot_token":"xoxb-…","signing_secret":"…","control_channel_ids":["C0123456789"]}'
```
