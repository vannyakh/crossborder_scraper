"""Grounded Telegram replies — tool-first, anti-hallucination."""

from gateway.integrate.runners.telegram.grounded_replies import match_grounded_intent
from gateway.integrate.runners.telegram.reply_scope import (
    format_network_location_reply,
    format_unsupported_reply,
    location_reply_mode,
    match_unsupported,
)
from gateway.integrate.runners.telegram.telegram_response import (
    format_agent_reply,
    sanitize_telegram_plain_text,
)


def test_match_location_intent() -> None:
    assert match_grounded_intent("let me know you location") == "network_location"
    assert match_grounded_intent("@bot what is the public ip") == "network_location"
    assert match_grounded_intent("hello") is None


def test_minimal_location_reply() -> None:
    text = format_network_location_reply(
        {
            "port": 8787,
            "bind_host": "0.0.0.0",
            "external_host": "203.0.113.10",
            "listening": [],
            "login_urls": {"public": "http://203.0.113.10:8787/ui/login"},
        },
        mode="minimal",
    )
    assert "203.0.113.10" in text
    assert "Country/region" in text
    assert "login" not in text.lower()
    assert "Checks" not in text
    assert "Tools" not in text


def test_location_mode_defaults_minimal() -> None:
    assert location_reply_mode("let me know you location") == "minimal"
    assert location_reply_mode("show firewall and network access") == "full"
    assert location_reply_mode("what is the login url") == "urls"


def test_unsupported_weather() -> None:
    reason = match_unsupported("what is the weather today")
    assert reason is not None
    text = format_unsupported_reply(reason)
    assert "Not supported" in text


def test_sanitize_strips_markdown() -> None:
    raw = "### Title\n\n**Service:** foo\n```bash\ncurl x\n```"
    clean = sanitize_telegram_plain_text(raw)
    assert "###" not in clean
    assert "**" not in clean


def test_format_agent_reply_blocks_unverified_without_tools() -> None:
    result = {
        "ok": True,
        "message": (
            "### Info\n**Service:** crossborder-scraper v0.1.0\nStorage path: var/data/products.db"
        ),
        "tool_calls": [],
    }
    text = format_agent_reply(result, 3500)
    assert "crossborder-scraper" not in text
    assert "Not supported" in text


def test_format_agent_reply_no_tools_footer() -> None:
    result = {
        "ok": True,
        "message": "🛡 Ops · Location\n\nVPS public IP: 1.2.3.4",
        "tool_calls": [{"name": "network_access_status", "ok": True}],
    }
    text = format_agent_reply(result, 3500)
    assert "Tools" not in text
    assert "1.2.3.4" in text
