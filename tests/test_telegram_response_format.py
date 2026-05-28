"""Telegram response formatting and about card tests."""

from gateway.integrate.runners.telegram.messages import (
    format_about_reply,
    format_welcome_reply,
)
from gateway.integrate.runners.telegram.telegram_response import format_agent_reply


def test_format_agent_reply_adds_scrape_intent_header() -> None:
    result = {
        "ok": True,
        "message": "Title: Sample product\nPrice: 12.99",
        "tool_calls": [{"name": "scrape_product", "ok": True, "outcome": "saved"}],
    }
    text = format_agent_reply(result, 3500)
    assert text.startswith("🛒 Scrape")
    assert "Sample product" in text


def test_format_agent_reply_uses_tool_specific_subtitle() -> None:
    result = {
        "ok": True,
        "message": "Deleted schedule 9db07a86-dcfc-47d3-946e-88df35717799.",
        "tool_calls": [{"name": "delete_schedule", "ok": True, "outcome": "deleted"}],
    }
    text = format_agent_reply(result, 3500)
    assert "⏰ Schedule · Delete schedule" in text
    assert "Cron automation" not in text


def test_format_agent_reply_preserves_existing_intent_line() -> None:
    result = {
        "ok": True,
        "message": "📡 Status · Engine\n\nAll healthy.",
        "tool_calls": [],
    }
    text = format_agent_reply(result, 3500)
    assert text.startswith("📡 Status")
    assert "All healthy" in text


def test_format_agent_reply_error_header() -> None:
    text = format_agent_reply({"ok": False, "message": "LLM timeout"}, 500)
    assert "🤖 Agent" in text
    assert "LLM timeout" in text


def test_about_reply_includes_capabilities_and_session() -> None:
    text = format_about_reply(
        chat_id=123456789,
        cfg={"bot_display_name": "Cross-Border Gateway Agent"},
        session_meta={"operator_name": "Lufy Frontend", "operator_username": "@lufy_jasmin"},
    )
    assert "👋 About me" in text
    assert "🛠 Capabilities" in text
    assert "📚 Active skills" in text
    assert "Lufy Frontend" in text
    assert "@lufy_jasmin" in text
    assert "123456789" in text


def test_welcome_first_visit_uses_about_card() -> None:
    text = format_welcome_reply(123, user_name="Alice", first_visit=True)
    assert "👋 About me" in text
    assert "Alice" not in text or "Session" in text
