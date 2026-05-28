# Telegram bot

Wire a **control chat** to the same gateway agent as the web panel.

## Before you start

Enable **Settings → Agent LLM** and set an API key — the agent needs a model to reply.

## 1. Create a bot token

Use [@BotFather](https://t.me/BotFather) on Telegram to create a bot and copy the token.

## 2. Configure the channel

**Integrate → Telegram** — paste the token, add control chat IDs, and enable the channel.

## 3. Reload and test

Save and reload the channel. Messages from allowed chats route through the gateway agent.

For the full Telegram guide (chat IDs, commands, env vars), open **Integrate → Telegram → Setup guide**.
