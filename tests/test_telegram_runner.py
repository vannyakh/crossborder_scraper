"""Telegram bot setup commands (/start, /getid)."""

from gateway.integrate.runners.telegram.runner import format_getid_reply, format_setup_reply


def test_setup_reply_unauthorized() -> None:
    text = format_setup_reply(-1001234567890, authorized=False)
    assert "Your chat id: `-1001234567890`" in text
    assert "Integrate → Telegram" in text
    assert "/getid" in text


def test_setup_reply_authorized() -> None:
    text = format_setup_reply(123456789, authorized=True)
    assert "123456789" in text
    assert "Send any text message" in text
    assert "/status" in text


def test_getid_reply_unauthorized() -> None:
    text = format_getid_reply(987654321, authorized=False)
    assert "`987654321`" in text
    assert "Allowed chat IDs" in text
