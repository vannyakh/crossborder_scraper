"""Cross-Border CLI — scrape, gateway agent, skills, panel serve."""

from __future__ import annotations

import typer

from cli.commands import (
    register_deploy_commands,
    register_gateway_commands,
    register_scrape_commands,
    register_service_commands,
    register_setup_commands,
    register_tools_commands,
)


def build_app() -> typer.Typer:
    app = typer.Typer(
        name="crossborder",
        help=(
            "[bold bright_blue]Cross-Border[/] — self-hosted AI agent hub: panel, "
            "gateway agent, integrate channels, scrape & export.\n\n"
            "[bold]Install:[/]   curl -fsSL "
            "https://raw.githubusercontent.com/vannyakh/crossborder_scraper/"
            "main/scripts/install.sh | bash\n"
            "[bold]Service:[/]  [cyan]crossborder service start[/]  "
            '[bold]Agent:[/]    [cyan]crossborder chat[/]  ·  [cyan]crossborder agent "…"[/]'
        ),
        rich_markup_mode="rich",
        no_args_is_help=True,
    )
    register_scrape_commands(app)
    register_setup_commands(app)
    register_deploy_commands(app)
    register_service_commands(app)
    register_tools_commands(app)
    register_gateway_commands(app)
    return app


app = build_app()
