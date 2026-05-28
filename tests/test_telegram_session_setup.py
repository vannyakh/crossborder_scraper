"""Telegram session onboarding."""

from __future__ import annotations

import pytest

from gateway.integrate.runners.telegram.session_setup import (
    channel_context_for_session,
    ensure_telegram_session_onboarding,
)


class _FakeUser:
    def __init__(self) -> None:
        self.id = 999
        self.first_name = "Alice"
        self.last_name = "Smith"
        self.username = "alice"
        self.full_name = "Alice Smith"


class _FakeChat:
    id = 5892882788
    type = "private"
    first_name = "Alice"
    username = "alice"


@pytest.fixture(autouse=True)
def _isolate_sessions(tmp_path, monkeypatch):
    path = tmp_path / "agent_chat_sessions.json"
    path.write_text('{"sessions": []}\n', encoding="utf-8")
    monkeypatch.setattr("gateway.chat_sessions.chat_sessions_path", lambda: path)
    yield


def test_ensure_telegram_session_onboarding_stores_meta() -> None:
    cfg = {
        "prompt_id": "telegram_agent",
        "bot_display_name": "Cross-Border Assistant",
        "bot_tagline": "Your gateway agent",
    }
    session, first = ensure_telegram_session_onboarding(
        _FakeChat.id,
        _FakeChat(),
        _FakeUser(),
        cfg,
    )
    assert first is True
    assert session["prompt_id"] == "telegram_agent"
    meta = session.get("meta") or {}
    assert meta.get("operator_name") == "Alice Smith"
    assert meta.get("operator_username") == "@alice"
    assert meta.get("bot_display_name") == "Cross-Border Assistant"
    assert meta.get("onboarded_at")

    session2, first2 = ensure_telegram_session_onboarding(
        _FakeChat.id,
        _FakeChat(),
        _FakeUser(),
        cfg,
    )
    assert first2 is False
    assert session2["id"] == session["id"]


def test_channel_context_for_session() -> None:
    session = {
        "channel_id": "telegram",
        "meta": {
            "onboarded_at": "2026-01-01T00:00:00+00:00",
            "operator_name": "Alice",
            "bot_display_name": "Cross-Border Assistant",
        },
    }
    ctx = channel_context_for_session(session)
    assert ctx is not None
    assert "Alice" in ctx
    assert "professional" in ctx.lower()
