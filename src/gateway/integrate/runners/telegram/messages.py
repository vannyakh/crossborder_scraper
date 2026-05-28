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
    session_meta: dict[str, Any] | None = None,
) -> str:
    if authorized:
        return format_welcome_reply(
            chat_id,
            user_name=user_name,
            cfg=cfg,
            first_visit=first_visit,
            group_hint=group_hint,
            session_meta=session_meta,
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
    session_meta: dict[str, Any] | None = None,
) -> str:
    if first_visit:
        return format_about_reply(
            chat_id=chat_id,
            cfg=cfg,
            user_name=user_name,
            session_meta=session_meta,
            group_hint=group_hint,
            compact=False,
        )

    bot_name = _bot_name(cfg)
    greeting = f"Welcome back{', ' + user_name if user_name else ''}!"
    lines = [
        greeting,
        "",
        f"{bot_name} is online.",
        f"Chat id: {chat_id} · Authorized",
        "",
        "Quick commands",
        "• /about — capabilities and active skills",
        "• /status · /skills · /commands",
        "• Send text — preview then Run agent to confirm",
    ]
    if group_hint:
        lines.extend(["", group_hint])
    return "\n".join(lines)


def format_about_reply(
    *,
    chat_id: int | str | None = None,
    cfg: dict[str, Any] | None = None,
    user_name: str | None = None,
    session_meta: dict[str, Any] | None = None,
    group_hint: str | None = None,
    compact: bool = False,
) -> str:
    """Operator-facing capability card (plain text — Telegram-safe)."""
    bot_name = _bot_name(cfg)
    tagline = _bot_tagline(cfg)
    meta = session_meta or {}

    operator = str(meta.get("operator_name") or user_name or "").strip()
    username = str(meta.get("operator_username") or "").strip()

    lines = [
        "👋 About me",
        "──────────",
        f"I'm the {bot_name} — {tagline}.",
        "",
        "🎯 What I do",
        (
            "Help sellers source products from Chinese B2B sites and prepare "
            "them for global marketplaces."
        ),
    ]
    if not compact:
        lines.extend(
            [
                "",
                "🛠 Capabilities",
                "🛒 Scraping — single or batch from 1688, Taobao, AliExpress",
                "🤖 AI extraction — field parse + English listing copy",
                "📊 Catalog — track products, monitor engine health",
                "🚀 Export — dry-run / publish to Shopee, Lazada, TikTok Shop, Shopify",
                "⏰ Automation — cron schedules with Telegram alerts",
                "🛡 Ops — VPS firewall, panel access, agent rules",
            ]
        )
        lines.extend(["", "📚 Active skills"])
        lines.extend(_format_skill_lines())
        lines.extend(
            [
                "",
                "🔒 Operating principles",
                "• Tool-grounded — only report what tools return",
                "• Safe by default — exports dry-run unless you publish",
                "• Concise — bullets and clear next steps",
            ]
        )

    session_lines = ["", "👤 Session"]
    if operator:
        who = f"Operator: {operator}"
        if username:
            who = f"{who} ({username})"
        session_lines.append(who)
    session_lines.append("Channel: Telegram control chat")
    if chat_id is not None:
        session_lines.append(f"Chat id: {chat_id} · Authorized")
    lines.extend(session_lines)

    if group_hint:
        lines.extend(["", group_hint])

    lines.extend(
        [
            "",
            "──────────",
            "Ready — share a URL, ask for a status check, or set up automation.",
            "",
            "Quick: /status · /skills · /commands",
        ]
    )
    return "\n".join(lines)


def _format_skill_lines() -> list[str]:
    try:
        from gateway.skills import get_skill_manager

        mgr = get_skill_manager()
        enabled = mgr.enabled_ids()
        rows: list[str] = []
        for row in mgr.list_catalog():
            sid = str(row.get("id") or "")
            if sid not in enabled:
                continue
            desc = str(row.get("description") or sid).split(".")[0].strip()
            if len(desc) > 56:
                desc = desc[:53] + "..."
            rows.append(f"• {sid} — {desc}")
        return rows or ["• (enable skills in Agent → Skills)"]
    except Exception:
        return [
            "• scrape-assistant · batch-ops · catalog-monitor",
            "• export-review · agent-control · panel-ops",
        ]


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


def format_agent_confirm_preview(text: str, *, reason: str | None = None) -> str:
    preview = text.strip()
    if len(preview) > 500:
        preview = preview[:497] + "..."
    label = reason or "High-risk action"
    return (
        f"⚠️ {label} — confirm before running\n\n"
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
