"""Telegram agent reply formatting — intent labels and mobile-friendly layout."""

from __future__ import annotations

import re
from typing import Any

# Intent taxonomy (matches telegram_agent.md)
INTENT_LABELS: dict[str, str] = {
    "scrape": "🛒 Scrape",
    "catalog": "📊 Catalog",
    "export": "🚀 Export",
    "schedule": "⏰ Schedule",
    "integrate": "💬 Integrate",
    "status": "📡 Status",
    "ops": "🛡 Ops",
    "setup": "⚙️ Setup",
    "agent": "🤖 Agent",
}

_TOOL_INTENT: dict[str, str] = {
    "scrape_product": "scrape",
    "submit_batch": "scrape",
    "list_products": "catalog",
    "export_listing": "export",
    "list_marketplaces": "export",
    "list_schedules": "schedule",
    "create_schedule": "schedule",
    "update_schedule": "schedule",
    "delete_schedule": "schedule",
    "run_schedule": "schedule",
    "list_integrate_channels": "integrate",
    "configure_integrate_channel": "integrate",
    "reload_integrate_channel": "integrate",
    "runtime_status": "status",
    "network_access_status": "ops",
    "setup_network_access": "ops",
    "apply_panel_firewall": "ops",
    "list_firewall_rules": "ops",
    "list_agent_rules": "ops",
}

_INTENT_PREFIX_RE = re.compile(
    r"^("
    r"🛒\s*Scrape|📊\s*Catalog|🚀\s*Export|⏰\s*Schedule|💬\s*Integrate|"
    r"📡\s*Status|🛡\s*Ops|⚙️\s*Setup|🤖\s*Agent"
    r")(?:\s*[·•\-—|:]\s*(.+))?$",
    re.IGNORECASE,
)


def infer_intent_from_tools(tool_calls: list[dict[str, Any]]) -> str | None:
    for call in tool_calls:
        name = str(call.get("name") or "").strip()
        if name in _TOOL_INTENT:
            return _TOOL_INTENT[name]
    return None


def subtitle_from_tools(tool_calls: list[dict[str, Any]]) -> str | None:
    """Short action label from the primary tool (more accurate than generic intent)."""
    _TOOL_SUBTITLE: dict[str, str] = {
        "scrape_product": "Product fetch",
        "submit_batch": "Batch scrape",
        "list_products": "Inventory",
        "export_listing": "Listing export",
        "list_marketplaces": "Marketplaces",
        "list_schedules": "Schedule list",
        "create_schedule": "New schedule",
        "update_schedule": "Update schedule",
        "delete_schedule": "Delete schedule",
        "run_schedule": "Run now",
        "list_integrate_channels": "Channels",
        "configure_integrate_channel": "Channel setup",
        "reload_integrate_channel": "Channel reload",
        "runtime_status": "Health snapshot",
        "network_access_status": "Network info",
        "setup_network_access": "Network setup",
        "apply_panel_firewall": "Firewall change",
        "list_firewall_rules": "Firewall rules",
        "list_agent_rules": "Agent rules",
    }
    for call in tool_calls:
        name = str(call.get("name") or "").strip()
        if name in _TOOL_SUBTITLE:
            return _TOOL_SUBTITLE[name]
    return None


def intent_label(intent_key: str | None) -> str:
    if not intent_key:
        return INTENT_LABELS["agent"]
    return INTENT_LABELS.get(intent_key, INTENT_LABELS["agent"])


def _compact_tool_line(call: dict[str, Any]) -> str:
    name = str(call.get("name") or "?")
    ok = call.get("ok")
    if ok is True:
        mark = "✓"
    elif ok is False:
        mark = "✗"
    else:
        mark = "·"
    outcome = str(call.get("outcome") or call.get("result") or "").strip()
    if outcome and len(outcome) > 48:
        outcome = outcome[:45] + "..."
    if outcome:
        return f"  {mark} {name} — {outcome}"
    return f"  {mark} {name}"


def _message_has_intent_prefix(message: str) -> bool:
    first = message.strip().splitlines()[0] if message.strip() else ""
    return bool(_INTENT_PREFIX_RE.match(first.strip()))


def sanitize_telegram_plain_text(text: str) -> str:
    """Strip Markdown-style formatting unsafe or ugly in plain Telegram messages."""
    out = text
    out = re.sub(r"^#{1,6}\s*", "", out, flags=re.MULTILINE)
    out = re.sub(r"\*\*([^*]+)\*\*", r"\1", out)
    out = re.sub(r"__([^_]+)__", r"\1", out)
    out = re.sub(r"`([^`]+)`", r"\1", out)
    out = re.sub(r"```[\w]*\n?", "", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


# LLM replies without tools that look like invented infrastructure or filler.
_UNVERIFIED_CLAIM = re.compile(
    r"\b("
    r"v\d+\.\d+|crossborder-scraper|var/data/|products\.db|"
    r"Service:|Storage path:|Public IP / region:|I don't have a geolocation|"
    r"How to check|Shell on the VPS|Cloud provider console"
    r")\b",
    re.I,
)

_FILLER_SECTION = re.compile(
    r"^(What I know|How to check|Tools:|Checks:)\s*$",
    re.I | re.MULTILINE,
)


def _reply_lacks_tool_backing(message: str, tool_calls: list[dict[str, Any]]) -> bool:
    if tool_calls:
        return False
    if _UNVERIFIED_CLAIM.search(message):
        return True
    if _FILLER_SECTION.search(message):
        return True
    # Long LLM reply with no tools — likely hallucination or off-topic dump
    if len(message.splitlines()) > 14:
        return True
    return False


def _unsupported_fallback_message() -> str:
    return (
        "🤖 Agent · Not supported\n\n"
        "I can't verify an answer for that from this chat.\n\n"
        "Try /about, /status, or ask a specific scrape, catalog, or schedule task."
    )


def format_agent_reply(result: dict[str, Any], max_chars: int) -> str:
    """Format gateway agent JSON for Telegram (plain text, intent header, compact tools)."""
    if not result.get("ok"):
        msg = sanitize_telegram_plain_text(str(result.get("message") or "Agent run failed."))
        if not _message_has_intent_prefix(msg):
            msg = f"{INTENT_LABELS['agent']} · Error\n\n{msg}"
        return msg[:max_chars]

    message = sanitize_telegram_plain_text(str(result.get("message") or "").strip())
    tools: list[dict[str, Any]] = list(result.get("tool_calls") or [])

    if _reply_lacks_tool_backing(message, tools):
        message = _unsupported_fallback_message()

    intent_key = infer_intent_from_tools(tools)
    header = intent_label(intent_key)
    tool_subtitle = subtitle_from_tools(tools)

    parts: list[str] = []
    if message:
        if _message_has_intent_prefix(message):
            parts.append(message)
        else:
            subtitle = tool_subtitle or _subtitle_for_intent(intent_key)
            line = f"{header} · {subtitle}" if subtitle else header
            parts.append(f"{line}\n\n{message}")
    else:
        parts.append(f"{header}\n\n(no text reply)")

    # Do not append internal tool-call footer — operators don't need it in Telegram.
    text = "\n\n".join(parts).strip()
    return text[:max_chars]


def _subtitle_for_intent(intent_key: str | None) -> str:
    subtitles = {
        "scrape": "Product fetch",
        "catalog": "Inventory check",
        "export": "Marketplace listing",
        "schedule": "Cron automation",
        "integrate": "Channel config",
        "status": "Health snapshot",
        "ops": "Panel / VPS",
        "setup": "Configuration",
        "agent": "Reply",
    }
    return subtitles.get(intent_key or "", "Reply")
