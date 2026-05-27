"""Setup, panel serve, and plugin catalog commands."""

from __future__ import annotations

import typer
from rich.table import Table

from cli.helpers import console
from config import get_settings


def register_setup_commands(app: typer.Typer) -> None:
    @app.command()
    def setup(
        regenerate: bool = typer.Option(
            False,
            "--regenerate",
            help="Generate new panel username/password even if .env already has them",
        ),
        server: bool = typer.Option(
            False,
            "--server",
            help="Full VPS/bootstrap: dirs, configs, Python deps, Playwright",
        ),
        docker: bool = typer.Option(
            False,
            "--docker",
            help="Prepare for Docker deploy (dirs, configs, credentials; no local browser)",
        ),
        host: str = typer.Option(
            "0.0.0.0",
            "--host",
            help="Panel bind address (0.0.0.0 = all interfaces, like aaPanel)",
        ),
        port: int | None = typer.Option(
            None,
            "--port",
            "-p",
            help="Panel TCP port (default 8787; auto-picks next free if busy)",
        ),
        external: str | None = typer.Option(
            None,
            "--external",
            "-e",
            help="Public IP or domain for display (e.g. VPS public IP)",
        ),
        no_auto_port: bool = typer.Option(
            False,
            "--fixed-port",
            help="Do not auto-change port if default (8787) is busy",
        ),
    ) -> None:
        """
        Initialize self-hosted panel — generates URL, IP, username, and password (aaPanel-style).

        Production server: scraper setup --server

        Docker host: scraper setup --docker  then  scraper deploy up
        """
        from config.credentials import print_panel_credentials
        from deploy.bootstrap import run_setup

        if docker:
            mode = "docker"
        elif server:
            mode = "server"
        else:
            mode = "panel"

        result = run_setup(
            mode=mode,
            regenerate=regenerate,
            bind_host=host,
            port=port,
            auto_port=not no_auto_port,
            external_host=external,
        )
        access = result["access"]
        print_panel_credentials(
            str(result["username"]),
            str(result["password"]),
            access=access,
            mode=mode,
        )

        if result["warnings"]:
            for w in result["warnings"]:
                console.print(f"[yellow]{w}[/yellow]")

        if mode == "panel" and not regenerate:
            console.print("[dim]Full VPS install: scraper setup --server[/dim]")

    @app.command("env-clean")
    def env_clean() -> None:
        """Move UI prefs to config/ui_config.json and remove them from .env."""
        from config.credentials import clean_env_file
        from config.ui_store import UI_CONFIG_PATH, load_ui_config

        load_ui_config()
        removed = clean_env_file()
        if removed:
            console.print(
                f"[green]Removed {len(removed)} UI key(s) from .env[/green]: {', '.join(removed)}"
            )
            console.print(f"[dim]Preferences stored in {UI_CONFIG_PATH}[/dim]")
        else:
            console.print("[yellow].env already clean — no UI preference keys found[/yellow]")

    @app.command()
    def serve(
        reload: bool = typer.Option(True, "--reload/--no-reload", help="Auto-reload on code changes"),
    ) -> None:
        """Run the FastAPI panel API (same as `uv run serve`)."""
        import os

        os.environ["UVICORN_RELOAD"] = "1" if reload else "0"
        from server.__main__ import main

        main()

    @app.command("plugins")
    def plugins_list(
        category: str | None = typer.Option(None, "--category", "-c", help="Filter: ecommerce, social, …"),
    ) -> None:
        """List built-in and installed scrape source plugins."""
        from core.plugins import list_source_catalog

        table = Table(title="Source plugins")
        table.add_column("ID")
        table.add_column("Kind")
        table.add_column("Category")
        table.add_column("Status")
        for row in list_source_catalog():
            if category and row.get("category") != category:
                continue
            table.add_row(
                str(row.get("id")),
                str(row.get("kind") or "source"),
                str(row.get("category")),
                str(row.get("status")),
            )
        console.print(table)
