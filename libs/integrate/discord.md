# Discord setup

Store **Discord bot credentials** so the gateway agent can control your guild when the live runner ships.

## Before you start

- Create a Discord application at the [Developer Portal](https://discord.com/developers/applications).
- Enable **AI & LLM** in panel Settings for future agent replies.

## 1. Create application & bot

1. **New Application** → note the **Application ID**.
2. Open **Bot** → **Reset Token** → copy the **bot token**.
3. Under **OAuth2 → URL Generator**, select `bot` scope and required permissions (Send Messages, Read Message History).
4. Invite the bot to your guild.

## 2. Collect IDs

| ID | Where to find it |
|----|------------------|
| **Guild ID** | Discord → User Settings → Advanced → Developer Mode → right-click server → Copy Server ID |
| **Channel IDs** | Right-click a text channel → Copy Channel ID |

## 3. Configure in the panel

| Field | Purpose |
|-------|---------|
| **Enable** | Mark channel active (runner coming soon) |
| **Bot token** | Bot token from Developer Portal |
| **Application ID** | Application snowflake |
| **Public key** | Optional — interaction signature verification |
| **Guild ID** | Server the bot listens on |
| **Allowed channel IDs** | Text channels that may trigger the agent |
| **Agent prompt** | Gateway role template |

Credentials are saved to `config/ui_config.json` under `integrate_channels.discord`.

## 4. When the runner is live

The same saved settings will route Discord messages to `GatewayAgent.run` with your chosen prompt and tool set — no re-entry required.

## Script & API

```bash
uv run crossborder gateway channels configure discord \
  --json '{"bot_token":"…","application_id":"…","guild_id":"…"}'
```

Agent tools: `list_integrate_channels`, `configure_integrate_channel`, `reload_integrate_channel`.
