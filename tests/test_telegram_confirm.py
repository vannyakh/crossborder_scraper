"""Telegram agent confirm-before-run flow."""

from gateway.integrate.runners.telegram.keyboards import agent_confirm_keyboard
from gateway.integrate.runners.telegram.messages import format_agent_confirm_preview
from gateway.integrate.runners.telegram.pending import confirm_before_agent, pending_agent


def test_confirm_before_agent_default_on() -> None:
    cfg = {"confirm_before_agent": True}
    assert confirm_before_agent(cfg, is_group=False) is True
    assert confirm_before_agent(cfg, is_group=True) is True


def test_confirm_groups_only() -> None:
    cfg = {"confirm_before_agent": True, "confirm_before_agent_groups_only": True}
    assert confirm_before_agent(cfg, is_group=False) is False
    assert confirm_before_agent(cfg, is_group=True) is True


def test_pending_store_roundtrip() -> None:
    req = pending_agent.put(
        chat_id=100,
        user_id=1,
        text="check status",
        prompt_id="telegram_agent",
    )
    assert req.token
    loaded = pending_agent.get(req.token)
    assert loaded is not None
    assert loaded.text == "check status"
    popped = pending_agent.pop(req.token)
    assert popped is not None
    assert pending_agent.get(req.token) is None


def test_confirm_keyboard_callback_data() -> None:
    kb = agent_confirm_keyboard("abc123")
    row = kb.inline_keyboard[0]
    assert row[0].callback_data == "a:ok:abc123"
    assert row[1].callback_data == "a:no:abc123"


def test_confirm_preview_text() -> None:
    text = format_agent_confirm_preview("list schedules")
    assert "confirm before running" in text.lower()
    assert "list schedules" in text
    assert "Run agent" in text
