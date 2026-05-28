"""Telegram chat session onboarding — store operator context on first /start."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from gateway.chat_sessions import get_or_create_platform_session, update_session
from gateway.integrate.bot_sessions import platform_session_label
from gateway.integrate.runners.telegram.chat_meta import telegram_chat_title


def ensure_telegram_session_onboarding(
    platform_chat_id: str | int,
    chat: Any,
    user: Any,
    cfg: dict[str, Any],
) -> tuple[dict[str, Any], bool]:
    """
    Create or update the panel session with operator + bot branding metadata.

    Returns (session, first_onboarding) where first_onboarding is True on the first /start.
    """
    pid = str(platform_chat_id).strip()
    title = telegram_chat_title(chat)
    prompt_id = str(cfg.get("prompt_id") or "telegram_agent").strip() or "telegram_agent"
    session = get_or_create_platform_session(
        "telegram",
        pid,
        label=platform_session_label("telegram", pid, platform_chat_title=title),
        platform_chat_title=title,
        prompt_id=prompt_id,
    )
    meta = dict(session.get("meta") or {})
    first = not meta.get("onboarded_at")

    operator_name = ""
    operator_username = ""
    operator_user_id: int | None = None
    if user is not None:
        operator_name = str(
            getattr(user, "full_name", None) or getattr(user, "first_name", "") or ""
        )
        if getattr(user, "username", None):
            operator_username = f"@{user.username}"
        uid = getattr(user, "id", None)
        if uid is not None:
            operator_user_id = int(uid)

    meta.update(
        {
            "onboarded_at": meta.get("onboarded_at") or _now_iso(),
            "operator_name": operator_name or meta.get("operator_name") or "",
            "operator_username": operator_username or meta.get("operator_username") or "",
            "operator_user_id": operator_user_id
            if operator_user_id is not None
            else meta.get("operator_user_id"),
            "bot_display_name": str(
                cfg.get("bot_display_name") or "Cross-Border Assistant"
            ).strip(),
            "bot_tagline": str(
                cfg.get("bot_tagline") or "Your gateway agent for cross-border operations"
            ).strip(),
            "channel": "telegram",
        }
    )
    session = update_session(session["id"], {"meta": meta, "prompt_id": prompt_id})
    return session, first


def channel_context_for_session(session: dict[str, Any]) -> str | None:
    """Optional system-prompt appendix from stored session metadata."""
    meta = session.get("meta")
    if not isinstance(meta, dict) or not meta.get("onboarded_at"):
        return None
    lines = ["Telegram control chat session."]
    name = str(meta.get("operator_name") or "").strip()
    if name:
        lines.append(f"Operator: {name}")
    username = str(meta.get("operator_username") or "").strip()
    if username:
        lines.append(f"Telegram: {username}")
    bot = str(meta.get("bot_display_name") or "").strip()
    if bot:
        lines.append(f"Assistant persona: {bot}")
    lines.append("Keep replies professional, concise, and tool-grounded.")
    lines.append(
        "Start each reply with an intent line: "
        "🛒 Scrape · 📊 Catalog · 🚀 Export · ⏰ Schedule · 💬 Integrate · "
        "📡 Status · 🛡 Ops · ⚙️ Setup · 🤖 Agent"
    )
    return "\n".join(lines)


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
