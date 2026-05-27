"""CLI command registration groups."""

from cli.commands.deploy_cmds import register_deploy_commands
from cli.commands.gateway_cmds import register_gateway_commands
from cli.commands.scrape_cmds import register_scrape_commands
from cli.commands.setup_cmds import register_setup_commands

__all__ = [
    "register_deploy_commands",
    "register_gateway_commands",
    "register_scrape_commands",
    "register_setup_commands",
]
