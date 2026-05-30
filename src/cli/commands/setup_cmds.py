"""Setup, panel serve, install, and plugin catalog commands."""

from __future__ import annotations

import typer
from rich.table import Table

from cli.helpers import console
from cli.onboard import print_mode_footer, print_onboard_banner, print_setup_progress
from cli.theme import hint, warn
from config import get_settings


def _run_setup_flow(
    *,
    mode: str,
    regenerate: bool,
    host: str,
    port: int | None,
    auto_port: bool,
    external: str | None,
    display_mode: str | None = None,
) -> None:
    from config.credentials import print_panel_credentials
    from deploy.bootstrap import run_setup
    from deploy.panel_access import default_next_commands

    card_mode = display_mode or mode
    print_onboard_banner(mode=card_mode)

    result = run_setup(
        mode=mode,
        regenerate=regenerate,
        bind_host=host,
        port=port,
        auto_port=auto_port,
        external_host=external,
    )

    print_setup_progress(
        list(result["steps"]),
        warnings=list(result["warnings"]),
    )

    access = result["access"]
    import os

    defer_card = os.environ.get("CROSSBORDER_DEFER_ACCESS_CARD", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if not defer_card:
        print_panel_credentials(
            str(result["username"]),
            str(result["password"]),
            access=access,
            mode=card_mode,
            next_commands=default_next_commands(card_mode),
        )

    print_mode_footer(mode)


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
            help="Panel bind address (0.0.0.0 = all interfaces)",
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
            help="Public IP/domain for URLs (server install defaults to auto-detect)",
        ),
        no_auto_port: bool = typer.Option(
            False,
            "--fixed-port",
            help="Do not auto-change port if default (8787) is busy",
        ),
    ) -> None:
        """
        Initialize self-hosted panel — URL, credentials, and optional full bootstrap.

        Quick: crossborder setup

        Full install: crossborder setup --server  (or crossborder install)
        """
        if docker:
            mode = "docker"
        elif server:
            mode = "server"
        else:
            mode = "panel"

        _run_setup_flow(
            mode=mode,
            regenerate=regenerate,
            host=host,
            port=port,
            auto_port=not no_auto_port,
            external=external,
        )

    @app.command()
    def install(
        regenerate: bool = typer.Option(False, "--regenerate", help="New panel password"),
        host: str = typer.Option("0.0.0.0", "--host", help="Bind address"),
        port: int | None = typer.Option(None, "--port", "-p", help="Panel port (default 8787)"),
        external: str | None = typer.Option(
            None,
            "--external",
            "-e",
            help="Public IP or domain for URLs in the access card",
        ),
        no_auto_port: bool = typer.Option(
            False,
            "--fixed-port",
            help="Fail if default port is busy instead of picking the next free port",
        ),
    ) -> None:
        """
        One-shot self-host install (dirs, deps, Playwright, credentials).

        Same as: crossborder setup --server
        """
        _run_setup_flow(
            mode="server",
            regenerate=regenerate,
            host=host,
            port=port,
            auto_port=not no_auto_port,
            external=external,
            display_mode="install",
        )

    @app.command("env-clean")
    def env_clean() -> None:
        """Move UI prefs to config/ui_config.json and remove them from .env."""
        from cli.theme import ok
        from config.credentials import clean_env_file
        from config.ui_store import UI_CONFIG_PATH, load_ui_config

        load_ui_config()
        removed = clean_env_file()
        if removed:
            console.print(ok(f"Removed {len(removed)} UI key(s) from .env: {', '.join(removed)}"))
            console.print(hint(f"Preferences stored in {UI_CONFIG_PATH}"))
        else:
            console.print(warn(".env already clean — no UI preference keys found"))

    @app.command()
    def serve(
        reload: bool = typer.Option(
            True, "--reload/--no-reload", help="Auto-reload on code changes"
        ),
    ) -> None:
        """Run the FastAPI panel API (same as `uv run serve`)."""
        import os

        from cli.onboard import print_onboard_banner
        from cli.theme import brand, hint, link_markup

        settings = get_settings()
        host = "127.0.0.1" if settings.panel_host in ("0.0.0.0", "::") else settings.panel_host
        login = f"http://{host}:{settings.panel_port}/ui/login"

        print_onboard_banner(mode="panel")
        console.print(brand("Starting panel server…"))
        console.print(hint(f"  Login: {link_markup(login)}"))
        console.print()

        os.environ["UVICORN_RELOAD"] = "1" if reload else "0"
        from server.__main__ import main

        main()

    @app.command("plugins")
    def plugins_list(
        category: str | None = typer.Option(
            None, "--category", "-c", help="Filter: ecommerce, social, …"
        ),
    ) -> None:
        """List built-in and installed scrape source plugins."""
        from core.plugins import list_source_catalog

        table = Table(title="Source plugins", border_style="bright_blue")
        table.add_column("ID", style="accent")
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
