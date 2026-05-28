"""Classify free-text agent requests for Telegram confirm-before-run."""

from __future__ import annotations

import re
from typing import Literal

RiskLevel = Literal["low", "high"]

# Schedule / cron mutations — checked before generic patterns (typo-tolerant).
_SCHEDULE_MUTATION = re.compile(
    r"(?:"
    r"\b(?:delete|delet|removed?|stop|disable|cancel|turn off|wipe)\w*\b"
    r".*\b(?:schedule|schedules|cron)\b"
    r"|"
    r"\b(?:schedule|schedules|cron)\b"
    r".*\b(?:delete|delet|removed?|stop|disable|cancel|turn off|wipe)\w*\b"
    r"|"
    r"\b(?:create|add|update|modify|change|set)\b.*\b(?:schedule|schedules|cron)\b"
    r"|"
    r"\b(?:schedule|schedules|cron)\b.*\b(?:create|add|update|modify|change|set)\b"
    r"|"
    r"\bschedule[s]?\s*:?\s*id\s+[a-f0-9-]{8,}\b"
    r")",
    re.I,
)

_SCHEDULE_DESTRUCTIVE = re.compile(
    r"\b(?:delete|delet|removed?|stop|disable|cancel|turn off|wipe)\w*\b",
    re.I,
)

# Mutating / destructive / credential — require inline confirm when enabled.
_HIGH_RISK: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(publish|go live|live export|not dry.?run)\b", re.I), "Live publish"),
    (re.compile(r"\bdry.?run\s*=\s*false\b", re.I), "Non dry-run export"),
    (
        re.compile(r"\b(delete|delet|remove|disable|turn off|wipe|reset)\b", re.I),
        "Destructive change",
    ),
    (re.compile(r"\b(firewall|ufw|open port|security group)\b", re.I), "Network / firewall"),
    (
        re.compile(r"\b(install skill|uninstall|configure).*(token|password|secret)\b", re.I),
        "Credential change",
    ),
    (re.compile(r"\b(bot_token|api[_ ]?key|password|secret)\b", re.I), "Secret handling"),
    (re.compile(r"\bconfigure\b.*\b(telegram|discord|slack|channel)\b", re.I), "Channel config"),
    (re.compile(r"\bhttps?://[^\s]+.*\bhttps?://", re.I), "Multiple URLs (batch scrape)"),
    (re.compile(r"\bscrape\s+(all|these|every|100\+)\b", re.I), "Large batch scrape"),
)

# Read-only / informational — run immediately.
_LOW_RISK: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(status|health|runtime|heartbeat)\b", re.I), "Status check"),
    (
        re.compile(r"\b(how many|count|list).*(product|catalog|schedule|skill|rule)\b", re.I),
        "Read-only list",
    ),
    (re.compile(r"\blist_(products|schedules|skills|tools)\b", re.I), "Read-only list"),
    (
        re.compile(
            r"\b(location|where am i|public ip|panel url|login url|my ip|server ip)\b",
            re.I,
        ),
        "Panel / network info",
    ),
    (re.compile(r"\b(let me know|tell me|what is|show me|check)\b", re.I), "Information request"),
    (re.compile(r"\b(dry.?run|preview export)\b", re.I), "Dry-run export"),
    (re.compile(r"\b(help|what can you|capabilities|about)\b", re.I), "Help"),
    (re.compile(r"^(hi|hello|hey|thanks|thank you)\b", re.I), "Greeting"),
)


def _schedule_mutation_reason(text: str) -> str:
    if _SCHEDULE_DESTRUCTIVE.search(text):
        return "Delete schedule"
    if re.search(r"\b(?:create|add)\b", text, re.I):
        return "New schedule"
    if re.search(r"\b(?:update|modify|change|set)\b", text, re.I):
        return "Update schedule"
    return "Schedule change"


def assess_agent_request_risk(text: str) -> tuple[RiskLevel, str | None]:
    """
    Return (level, reason). Default low — only explicit high-risk patterns require confirm.
    """
    body = (text or "").strip()
    if not body:
        return "low", None
    normalized = body.lower()

    if _SCHEDULE_MUTATION.search(normalized):
        return "high", _schedule_mutation_reason(body)

    for pattern, reason in _HIGH_RISK:
        if pattern.search(normalized):
            return "high", reason

    for pattern, _label in _LOW_RISK:
        if pattern.search(normalized):
            return "low", None

    return "low", None


def needs_agent_confirmation(
    cfg: dict,
    text: str,
    *,
    is_group: bool,
) -> tuple[bool, str | None]:
    """
    Whether to show Run agent / Cancel before executing.

    confirm_before_agent=false → never
    confirm_before_agent_always=true → always (legacy)
    else → only high-risk requests
    """
    if not cfg.get("confirm_before_agent", True):
        return False, None
    if cfg.get("confirm_before_agent_groups_only", False) and not is_group:
        return False, None
    if cfg.get("confirm_before_agent_always", False):
        return True, "Confirmation required for all agent messages."

    level, reason = assess_agent_request_risk(text)
    if level == "high":
        return True, reason
    return False, None


def confirm_before_agent(cfg: dict, *, is_group: bool) -> bool:
    """Legacy helper — True when confirm feature is enabled (not per-message)."""
    if not cfg.get("confirm_before_agent", True):
        return False
    if cfg.get("confirm_before_agent_groups_only", False) and not is_group:
        return False
    return True
