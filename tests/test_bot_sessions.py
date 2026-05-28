"""Bot session bridge."""

from __future__ import annotations

from gateway.chat_sessions import get_or_create_platform_session
from gateway.integrate.bot_sessions import resolve_bot_session
from gateway.integrate.runners.telegram.chat_meta import telegram_chat_title


class _FakeUser:
    def __init__(self, **kwargs):
        self.first_name = kwargs.get("first_name")
        self.last_name = kwargs.get("last_name")
        self.username = kwargs.get("username")


class _FakeChat:
    def __init__(self, chat_id: int, **kwargs):
        self.id = chat_id
        self.type = kwargs.get("type", "private")
        self.title = kwargs.get("title")
        self.first_name = kwargs.get("first_name")
        self.last_name = kwargs.get("last_name")
        self.username = kwargs.get("username")


def test_resolve_bot_session_creates_platform_session():
    session = resolve_bot_session(
        channel_id="telegram",
        platform_chat_id="12345",
        platform_chat_title="Alice",
    )
    assert session["channel_id"] == "telegram"
    assert session["platform_chat_id"] == "12345"
    assert session["platform_chat_title"] == "Alice"
    assert session["label"] == "Alice"
    assert session["display_label"] == "Alice"


def test_telegram_chat_title_group():
    chat = _FakeChat(-1003674076201, type="supergroup", title="Cross Agen")
    assert telegram_chat_title(chat) == "Cross Agen"


def test_telegram_chat_title_direct():
    chat = _FakeChat(5892882788, type="private", first_name="Bob", username="bob_user")
    assert telegram_chat_title(chat) == "Bob"


def test_get_or_create_updates_title():
    first = get_or_create_platform_session(
        channel_id="telegram",
        platform_chat_id="999",
        platform_chat_title="Old Name",
    )
    second = get_or_create_platform_session(
        channel_id="telegram",
        platform_chat_id="999",
        platform_chat_title="Cross Agen",
    )
    assert first["id"] == second["id"]
    assert second["platform_chat_title"] == "Cross Agen"
    assert second["label"] == "Cross Agen"
    assert second["display_label"] == "Cross Agen"
