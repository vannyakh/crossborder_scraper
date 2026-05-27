"""Crossborder scraper CLI — scrape, gateway agent, skills, panel serve."""

from __future__ import annotations

import typer

from cli.commands import (
    register_deploy_commands,
    register_gateway_commands,
    register_scrape_commands,
    register_setup_commands,
    register_tools_commands,
)


def build_app() -> typer.Typer:
    app = typer.Typer(
        name="scraper",
        help=(
            "Scrape 1688/Taobao/AliExpress · export to marketplaces · "
            "gateway agent with OpenClaw-style skills"
        ),
        no_args_is_help=True,
    )
    register_scrape_commands(app)
    register_setup_commands(app)
    register_deploy_commands(app)
    register_tools_commands(app)
    register_gateway_commands(app)
    return app


app = build_app()
