"""Sync Telegram BotFather command menu from the local command registry."""

from __future__ import annotations

from loguru import logger
from telegram import Bot, BotCommand, MenuButtonCommands

from gateway.integrate.runners.telegram.commands.registry import all_commands

_MAX_DESC_LEN = 256


def build_bot_commands() -> list[BotCommand]:
    """Build BotCommand list for Telegram ``setMyCommands``."""
    rows: list[BotCommand] = []
    for spec in all_commands():
        desc = spec.description.strip()
        if len(desc) > _MAX_DESC_LEN:
            desc = desc[: _MAX_DESC_LEN - 1] + "…"
        rows.append(BotCommand(command=spec.name, description=desc))
    return rows


async def sync_command_menu(bot: Bot) -> int:
    """
    Register slash commands and enable the menu button (☰) in Telegram clients.

    Returns the number of commands registered.
    """
    commands = build_bot_commands()
    await bot.set_my_commands(commands)
    await bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    logger.debug("Telegram setMyCommands + MenuButtonCommands applied ({} items)", len(commands))
    return len(commands)
