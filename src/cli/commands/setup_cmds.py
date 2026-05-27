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
    ) -> None:
        """Initialize .env with auto-generated panel login credentials."""
        from config.credentials import ensure_panel_credentials, print_panel_credentials

        username, password, generated = ensure_panel_credentials(force_regenerate=regenerate)
        print_panel_credentials(username, password)
        if not generated and not regenerate:
            console.print("[yellow]Panel credentials already in .env[/yellow]")
        else:
            console.print("[green]Credentials written to .env[/green]")

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
