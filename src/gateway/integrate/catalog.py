"""Integrate channel catalog — field schemas and setup steps for the panel."""

from __future__ import annotations

from typing import Any, Literal

ChannelId = Literal["telegram", "discord", "slack", "email"]
ChannelRunner = Literal["live", "stored"]

ALL_CHANNEL_IDS: tuple[str, ...] = ("telegram", "discord", "slack", "email")


def _field(
    key: str,
    *,
    type: str,
    label: str,
    placeholder: str = "",
    helper: str = "",
) -> dict[str, str]:
    return {
        "key": key,
        "type": type,
        "label": label,
        "placeholder": placeholder,
        "helper": helper,
    }


CHANNEL_CATALOG: dict[str, dict[str, Any]] = {
    "telegram": {
        "label": "Telegram",
        "description": "Control chat channel — messages run the same gateway agent as web chat",
        "runner": "live",
        "setup_steps": [
            "Create a bot with @BotFather and paste the token below.",
            "Enable Telegram and save (panel server must be running).",
            "Message your bot /start or /getid — it replies with your chat id.",
            "Add that id to allowed chats and save. Messages sync to Agent → Chat.",
        ],
        "fields": [
            _field("enabled", type="boolean", label="Enable Telegram bot (long-polling)"),
            _field(
                "allow_any_chat",
                type="boolean",
                label="Allow any chat (not recommended for production)",
            ),
            _field(
                "bot_token",
                type="secret",
                label="Bot token",
                placeholder="From @BotFather",
                helper="Leave blank to keep the current token. Or set TELEGRAM_BOT_TOKEN in .env.",
            ),
            _field(
                "control_chat_ids",
                type="chat_ids",
                label="Allowed chat IDs",
                placeholder="-1001234567890, 123456789",
                helper="Comma or space separated. Get ids from /start or /getid on your bot.",
            ),
            _field("prompt_id", type="prompt", label="Agent prompt"),
            _field("max_reply_chars", type="number", label="Max reply length"),
        ],
    },
    "discord": {
        "label": "Discord",
        "description": "Guild bot channel for gateway agent commands",
        "runner": "stored",
        "setup_steps": [
            "Create an application and bot in the Discord Developer Portal.",
            "Paste the bot token and application id below, then save credentials.",
            "Add the bot to your guild and note the guild id and channel ids.",
            "Enable the channel when the Discord runner ships in a future release.",
        ],
        "fields": [
            _field(
                "enabled", type="boolean", label="Enable Discord channel (credentials only for now)"
            ),
            _field(
                "allow_any_guild",
                type="boolean",
                label="Allow any guild (not recommended for production)",
            ),
            _field(
                "bot_token",
                type="secret",
                label="Bot token",
                placeholder="From Discord Developer Portal",
            ),
            _field("application_id", type="text", label="Application ID"),
            _field(
                "public_key",
                type="secret",
                label="Public key",
                helper="Optional — used for interaction verification when the runner is enabled.",
            ),
            _field("guild_id", type="text", label="Guild ID"),
            _field(
                "control_channel_ids",
                type="channel_ids",
                label="Allowed channel IDs",
                placeholder="123456789012345678, 987654321098765432",
                helper="Comma or space separated Discord channel snowflakes.",
            ),
            _field("prompt_id", type="prompt", label="Agent prompt"),
            _field("max_reply_chars", type="number", label="Max reply length"),
        ],
    },
    "slack": {
        "label": "Slack",
        "description": "Workspace app channel for gateway agent commands",
        "runner": "stored",
        "setup_steps": [
            "Create a Slack app with Bot Token and Signing Secret.",
            "Paste credentials below and list allowed channel ids.",
            "Enable when the Slack runner ships in a future release.",
        ],
        "fields": [
            _field(
                "enabled", type="boolean", label="Enable Slack channel (credentials only for now)"
            ),
            _field(
                "allow_any_workspace",
                type="boolean",
                label="Allow any workspace channel (not recommended for production)",
            ),
            _field("bot_token", type="secret", label="Bot token (xoxb-…)"),
            _field("signing_secret", type="secret", label="Signing secret"),
            _field(
                "app_token",
                type="secret",
                label="App-level token (xapp-…)",
                helper="Optional — socket mode when the runner is enabled.",
            ),
            _field(
                "control_channel_ids",
                type="channel_ids",
                label="Allowed channel IDs",
                placeholder="C0123456789, C9876543210",
            ),
            _field("prompt_id", type="prompt", label="Agent prompt"),
            _field("max_reply_chars", type="number", label="Max reply length"),
        ],
    },
    "email": {
        "label": "Email",
        "description": "Inbound mailbox triggers for gateway agent workflows",
        "runner": "stored",
        "setup_steps": [
            "Configure IMAP inbox credentials for inbound agent triggers.",
            "Optionally set SMTP for reply delivery when the runner is enabled.",
            "List allowed sender addresses to restrict who can control the agent.",
        ],
        "fields": [
            _field(
                "enabled", type="boolean", label="Enable email channel (credentials only for now)"
            ),
            _field("imap_host", type="text", label="IMAP host", placeholder="imap.example.com"),
            _field("imap_port", type="number", label="IMAP port"),
            _field("imap_username", type="text", label="IMAP username"),
            _field("imap_password", type="secret", label="IMAP password"),
            _field(
                "smtp_host",
                type="text",
                label="SMTP host (optional)",
                placeholder="smtp.example.com",
            ),
            _field("smtp_port", type="number", label="SMTP port"),
            _field("smtp_username", type="text", label="SMTP username"),
            _field("smtp_password", type="secret", label="SMTP password"),
            _field("mailbox_folder", type="text", label="Mailbox folder", placeholder="INBOX"),
            _field(
                "allowed_senders",
                type="channel_ids",
                label="Allowed sender addresses",
                placeholder="ops@example.com, agent@example.com",
            ),
            _field("prompt_id", type="prompt", label="Agent prompt"),
            _field("max_reply_chars", type="number", label="Max reply length"),
        ],
    },
}


def get_catalog_entry(channel_id: str) -> dict[str, Any] | None:
    return CHANNEL_CATALOG.get(channel_id)
