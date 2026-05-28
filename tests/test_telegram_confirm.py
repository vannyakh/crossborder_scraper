"""Telegram agent confirm-before-run flow."""

from gateway.integrate.runners.telegram.keyboards import agent_confirm_keyboard
from gateway.integrate.runners.telegram.messages import format_agent_confirm_preview
from gateway.integrate.runners.telegram.pending import pending_agent
from gateway.integrate.runners.telegram.request_risk import (
    assess_agent_request_risk,
    confirm_before_agent,
    needs_agent_confirmation,
)


def test_confirm_before_agent_master_switch() -> None:
    cfg = {"confirm_before_agent": True}
    assert confirm_before_agent(cfg, is_group=False) is True
    assert confirm_before_agent({"confirm_before_agent": False}, is_group=True) is False


def test_confirm_groups_only_skips_dms() -> None:
    cfg = {"confirm_before_agent": True, "confirm_before_agent_groups_only": True}
    need, _ = needs_agent_confirmation(cfg, "delete all schedules", is_group=False)
    assert need is False


def test_location_request_runs_without_confirm() -> None:
    cfg = {"confirm_before_agent": True}
    need, reason = needs_agent_confirmation(cfg, "let me know you location", is_group=True)
    assert need is False
    assert reason is None
    level, _ = assess_agent_request_risk("let me know you location")
    assert level == "low"


def test_delete_requires_confirm() -> None:
    cfg = {"confirm_before_agent": True}
    need, reason = needs_agent_confirmation(cfg, "delete schedule health ping", is_group=False)
    assert need is True
    assert reason == "Delete schedule"


def test_delete_schedule_typo_requires_confirm() -> None:
    cfg = {"confirm_before_agent": True}
    msg = "stop and delet Cron schedules: id 9db07a86-dcfc-47d3-946e-88df35717799"
    need, reason = needs_agent_confirmation(cfg, msg, is_group=True)
    assert need is True
    assert reason == "Delete schedule"


def test_create_schedule_requires_confirm() -> None:
    cfg = {"confirm_before_agent": True}
    need, reason = needs_agent_confirmation(
        cfg, "create a cron schedule every day at 9am", is_group=False
    )
    assert need is True
    assert reason == "New schedule"


def test_confirm_always_legacy() -> None:
    cfg = {"confirm_before_agent": True, "confirm_before_agent_always": True}
    need, reason = needs_agent_confirmation(cfg, "hello", is_group=False)
    assert need is True
    assert reason is not None


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


def test_confirm_preview_shows_risk_reason() -> None:
    text = format_agent_confirm_preview("publish to shopee", reason="Live publish")
    assert "Live publish" in text
    assert "publish to shopee" in text
    assert "Run agent" in text
