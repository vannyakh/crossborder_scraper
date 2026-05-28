"""User-facing Telegram bot message templates (plain text — safe for all clients)."""

from __future__ import annotations

from typing import Any

from gateway.integrate.runners.telegram.commands.types import CommandSpec


def format_setup_reply(
    chat_id: int | str,
    *,
    authorized: bool,
    user_name: str | None = None,
    cfg: dict[str, Any] | None = None,
    first_visit: bool = True,
    group_hint: str | None = None,
) -> str:
    if authorized:
        return format_welcome_reply(
            chat_id,
            user_name=user_name,
            cfg=cfg,
            first_visit=first_visit,
            group_hint=group_hint,
        )
    lines = [
        _bot_name(cfg),
        "",
        "Setup — add this chat in the panel:",
        f"Chat id: {chat_id}",
        "",
        "1. Open Integrate → Telegram → Allowed chat IDs",
        "2. Paste the chat id above and save",
        "3. Send /start again",
        "",
        "Setup commands: /getid · /whoami · /commands",
    ]
    return "\n".join(lines)


def format_welcome_reply(
    chat_id: int | str,
    *,
    user_name: str | None = None,
    cfg: dict[str, Any] | None = None,
    first_visit: bool = True,
    group_hint: str | None = None,
) -> str:
    bot_name = _bot_name(cfg)
    tagline = _bot_tagline(cfg)
    if first_visit:
        greeting = f"Hello{', ' + user_name if user_name else ''}!"
        intro = f"I'm {bot_name} — {tagline}."
    else:
        greeting = f"Welcome back{', ' + user_name if user_name else ''}!"
        intro = f"{bot_name} is online."

    lines = [
        greeting,
        "",
        intro,
        f"Chat id: {chat_id} · Authorized",
        "",
        "What I do",
        "• Scrape & catalog — sourcing sites and product health",
        "• Export review — marketplace dry-runs",
        "• Schedules & alerts — cron jobs with Telegram notify",
        "",
        "Quick commands",
        "• Send any text — preview then tap Run agent to confirm",
        "• /status · /skills · /commands",
        "• Tap the menu button (☰) next to the message box for slash commands",
    ]
    if group_hint:
        lines.extend(["", group_hint])
    return "\n".join(lines)


def _bot_name(cfg: dict[str, Any] | None) -> str:
    if cfg:
        name = str(cfg.get("bot_display_name") or "").strip()
        if name:
            return name
    return "Cross-Border Assistant"


def _bot_tagline(cfg: dict[str, Any] | None) -> str:
    if cfg:
        line = str(cfg.get("bot_tagline") or "").strip()
        if line:
            return line
    return "Your gateway agent for cross-border operations"


def format_getid_reply(chat_id: int | str, *, authorized: bool) -> str:
    if authorized:
        return f"Chat id: {chat_id} · authorized"
    return (
        f"Chat id: {chat_id}\n"
        "Add it to Integrate → Telegram → Allowed chat IDs, save, then send /start."
    )


def format_agent_confirm_preview(text: str) -> str:
    preview = text.strip()
    if len(preview) > 500:
        preview = preview[:497] + "..."
    return (
        "Agent request — confirm before running:\n\n"
        f"{preview}\n\n"
        "Tap Run agent to proceed, or Cancel to discard."
    )


def format_commands_menu(commands: tuple[CommandSpec, ...], *, authorized: bool) -> str:
    lines = ["Gateway agent — slash commands", ""]
    for cmd in commands:
        if cmd.requires_auth and not authorized:
            continue
        lines.append(f"/{cmd.name} — {cmd.description}")
    if not authorized:
        lines.append("")
        lines.append("Authorize this chat in the panel to unlock agent and system commands.")
    return "\n".join(lines)
