"""Out-of-scope detection and minimal Telegram replies (no LLM, no filler)."""

from __future__ import annotations

import re
from typing import Any, Literal

LocationReplyMode = Literal["minimal", "urls", "full"]

# No gateway tool covers these — refuse briefly, do not call the LLM.
_UNSUPPORTED_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(weather|forecast|temperature)\b", re.I), "Weather is not a panel feature."),
    (
        re.compile(r"\b(stock price|crypto price|bitcoin price)\b", re.I),
        "Market prices are not a panel feature.",
    ),
    (
        re.compile(r"\b(translate|translation)\b.*\b(poem|story|essay)\b", re.I),
        "General translation is not a panel feature.",
    ),
    (
        re.compile(r"\b(your phone|my phone|device location|gps coordinates)\b", re.I),
        "Device GPS is not available — I only see VPS/panel network info.",
    ),
)

_URL_ASK = re.compile(r"\b(login url|panel url|open panel|login link|access url)\b", re.I)
_FULL_NETWORK = re.compile(
    r"\b(firewall|network access|diagnostic|full status|health check|checks)\b",
    re.I,
)


def match_unsupported(text: str) -> str | None:
    body = (text or "").strip()
    if not body:
        return None
    for pattern, reason in _UNSUPPORTED_PATTERNS:
        if pattern.search(body):
            return reason
    return None


def format_unsupported_reply(reason: str) -> str:
    return (
        "🤖 Agent · Not supported\n\n"
        f"{reason}\n\n"
        "This chat handles scrape, catalog, export, schedules, and panel status.\n"
        "Try /about or ask a specific task."
    )


def location_reply_mode(text: str) -> LocationReplyMode:
    """How much network_access_status to show — default minimal (answer the question only)."""
    body = (text or "").strip()
    if _FULL_NETWORK.search(body):
        return "full"
    if _URL_ASK.search(body):
        return "urls"
    return "minimal"


def format_network_location_reply(
    status: dict[str, Any],
    *,
    mode: LocationReplyMode = "minimal",
) -> str:
    """Answer location/IP asks with only relevant fields — no diagnostic dump by default."""
    port = status.get("port")
    bind = status.get("bind_host") or "—"
    ext = str(status.get("external_host") or "").strip()
    listen = status.get("listening") or []
    login = status.get("login_urls") or {}

    if mode == "minimal":
        lines = ["🛡 Ops · Location", ""]
        if ext:
            lines.append(f"VPS public IP: {ext}")
        else:
            lines.append("Public IP: not detected — set PANEL_EXTERNAL_HOST in .env")
        lines.append("")
        lines.append("Country/region: not available from panel tools.")
        lines.append("Check your cloud provider console for the instance region.")
        if not listen:
            lines.append("")
            lines.append("Note: panel API is not running — crossborder service start")
        return "\n".join(lines)

    if mode == "urls":
        lines = ["🛡 Ops · Panel access", ""]
        local_url = login.get("local")
        public_url = login.get("public")
        if public_url:
            lines.append(f"Public login: {public_url}")
        elif ext:
            lines.append(f"Public host: {ext}:{port}")
        if local_url:
            lines.append(f"Local login: {local_url}")
        if not public_url and not local_url:
            lines.append("No login URL detected — run crossborder setup")
        return "\n".join(lines)

    # full — explicit network / firewall diagnostic request only
    lines = [
        "🛡 Ops · Network status",
        "",
        f"• Bind: {bind}:{port}",
    ]
    if listen:
        lines.append(f"• Listening: {', '.join(str(x) for x in listen[:3])}")
    if ext:
        lines.append(f"• Public IP: {ext}")
    checks = status.get("checks") or []
    failed = [c for c in checks if c.get("ok") is False]
    if failed:
        lines.extend(["", "Needs attention"])
        for row in failed[:3]:
            label = str(row.get("label") or row.get("id") or "check")
            detail = str(row.get("detail") or "").strip()[:70]
            lines.append(f"• {label}: {detail}")
    return "\n".join(lines)


def format_runtime_status_reply(status: dict[str, Any]) -> str:
    lines = ["📡 Status · Engine", ""]
    batches = status.get("running_batches") or []
    lines.append(f"• Running batches: {len(batches)}")
    ai = status.get("ai") or {}
    if ai:
        ready = "ready" if ai.get("llm_ready") else "not ready"
        lines.append(f"• Agent LLM: {ready}")
    engine = status.get("engine") or {}
    if engine.get("max_concurrent_jobs") is not None:
        lines.append(f"• Max concurrent jobs: {engine.get('max_concurrent_jobs')}")
    return "\n".join(lines)
