"""Telegram slash-command registry."""

from __future__ import annotations

from telegram.ext import Application, CommandHandler

from gateway.integrate.runners.telegram.commands import agent, setup, system
from gateway.integrate.runners.telegram.commands.types import CommandSpec

_COMMANDS: tuple[CommandSpec, ...] = (
    CommandSpec("start", "Welcome and setup summary.", setup.cmd_start, requires_auth=False),
    CommandSpec("help", "Show welcome and setup summary.", setup.cmd_help, requires_auth=False),
    CommandSpec(
        "about",
        "Capabilities, skills, and session summary.",
        setup.cmd_about,
        requires_auth=True,
    ),
    CommandSpec(
        "commands",
        "List all slash commands.",
        setup.cmd_commands,
        requires_auth=False,
    ),
    CommandSpec("getid", "Show this chat id.", setup.cmd_getid, requires_auth=False),
    CommandSpec(
        "whoami",
        "Show chat id, user id, and auth status.",
        setup.cmd_whoami,
        requires_auth=False,
    ),
    CommandSpec("status", "Gateway service, engine, and agent LLM status.", system.cmd_status),
    CommandSpec("skills", "List enabled agent skills.", agent.cmd_skills),
    CommandSpec("skill", "Run the agent with one skill: /skill <id> [message].", agent.cmd_skill),
    CommandSpec("schedules", "List cron schedules.", system.cmd_schedules),
    CommandSpec("rules", "List enabled agent behavior rules.", system.cmd_rules),
    CommandSpec(
        "context",
        "Show synced panel chat session for this Telegram chat.",
        agent.cmd_context,
    ),
    CommandSpec("stop", "Stop the in-flight agent reply for this chat.", system.cmd_stop),
)


def all_commands() -> tuple[CommandSpec, ...]:
    return _COMMANDS


def register_command_handlers(app: Application) -> None:
    for spec in _COMMANDS:
        app.add_handler(CommandHandler(spec.name, spec.handler))
