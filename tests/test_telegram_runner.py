"""Telegram bot setup commands and command registry."""

from gateway.integrate.runners.telegram.commands.registry import all_commands
from gateway.integrate.runners.telegram.messages import (
    format_getid_reply,
    format_setup_reply,
    format_welcome_reply,
)


def test_setup_reply_unauthorized() -> None:
    text = format_setup_reply(-1001234567890, authorized=False)
    assert "Chat id: -1001234567890" in text
    assert "Integrate → Telegram" in text
    assert "/getid" in text


def test_welcome_reply_authorized() -> None:
    cfg = {
        "bot_display_name": "Cross-Border Assistant",
        "bot_tagline": "Your gateway agent for cross-border operations",
    }
    text = format_welcome_reply(123456789, user_name="Alice", cfg=cfg, first_visit=True)
    assert "Hello, Alice!" in text
    assert "Cross-Border Assistant" in text
    assert "cross-border operations" in text
    assert "123456789" in text
    assert "Authorized" in text
    assert "/status" in text


def test_welcome_reply_returning_user() -> None:
    text = format_welcome_reply(123456789, user_name="Alice", first_visit=False)
    assert "Welcome back, Alice!" in text


def test_setup_reply_authorized_delegates_to_welcome() -> None:
    text = format_setup_reply(123456789, authorized=True)
    assert "Hello!" in text
    assert "/commands" in text


def test_getid_reply_unauthorized() -> None:
    text = format_getid_reply(987654321, authorized=False)
    assert "987654321" in text
    assert "Allowed chat IDs" in text


def test_command_registry_includes_core_commands() -> None:
    names = {c.name for c in all_commands()}
    assert names >= {
        "start",
        "help",
        "commands",
        "whoami",
        "status",
        "skills",
        "skill",
        "schedules",
        "context",
        "stop",
    }


def test_commands_menu_lists_public_when_unauthorized() -> None:
    from gateway.integrate.runners.telegram.messages import format_commands_menu

    text = format_commands_menu(all_commands(), authorized=False)
    assert "/start" in text
    assert "/whoami" in text
    assert "/status" not in text


def test_commands_menu_lists_agent_when_authorized() -> None:
    from gateway.integrate.runners.telegram.messages import format_commands_menu

    text = format_commands_menu(all_commands(), authorized=True)
    assert "/status" in text
    assert "/skill" in text
    assert "/stop" in text


def test_telegram_bot_command_menu_matches_registry() -> None:
    from gateway.integrate.runners.telegram.commands.menu import build_bot_commands

    menu = build_bot_commands()
    registry = all_commands()
    assert len(menu) == len(registry)
    assert [c.command for c in menu] == [s.name for s in registry]
    for cmd in menu:
        assert cmd.command
        assert cmd.description
        assert len(cmd.description) <= 256


def test_sync_command_menu_calls_telegram_apis() -> None:
    import asyncio
    from unittest.mock import AsyncMock

    from gateway.integrate.runners.telegram.commands.menu import sync_command_menu

    bot = AsyncMock()
    count = asyncio.run(sync_command_menu(bot))
    assert count == len(all_commands())
    bot.set_my_commands.assert_awaited_once()
    bot.set_chat_menu_button.assert_awaited_once()
