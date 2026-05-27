"""Panel software tools — sync, update, restart, reset."""

from __future__ import annotations

import typer
from rich.table import Table

from cli.helpers import console
from cli.theme import hint, warn
from deploy.maintenance import (
    ResetScope,
    RuntimeKind,
    run_reset,
    run_restart,
    run_sync,
    run_update,
)

tools_app = typer.Typer(
    help="Sync, update, restart, and reset the self-hosted panel (aaPanel-style tooling)",
)


def register_tools_commands(app: typer.Typer) -> None:
    app.add_typer(tools_app, name="tools")


def _print_result(title: str, result: object) -> None:
    from deploy.maintenance import MaintenanceResult

    assert isinstance(result, MaintenanceResult)
    if result.steps:
        table = Table(title=title, border_style="bright_blue")
        table.add_column("Step", style="ok")
        for step in result.steps:
            table.add_row(step)
        console.print(table)
    if result.warnings:
        for w in result.warnings:
            console.print(warn(w))
    if result.runtime != RuntimeKind.NONE:
        console.print(hint(f"Runtime: {result.runtime.value}"))


@tools_app.command("sync")
def tools_sync(
    no_pull: bool = typer.Option(False, "--no-pull", help="Skip git pull"),
    branch: str | None = typer.Option(None, "--branch", "-b", help="Git branch to pull"),
    no_deps: bool = typer.Option(False, "--no-deps", help="Skip uv sync / pip install"),
    browser: bool = typer.Option(False, "--browser", help="Update Playwright Chromium"),
    browser_deps: bool = typer.Option(
        False,
        "--browser-deps",
        help="Run playwright install-deps (Linux)",
    ),
    docker_rebuild: bool = typer.Option(
        False,
        "--docker-rebuild",
        help="Rebuild and restart Docker stack after sync",
    ),
) -> None:
    """Pull latest code and refresh Python dependencies."""
    result = run_sync(
        pull=not no_pull,
        branch=branch,
        deps=not no_deps,
        browser=browser,
        browser_deps=browser_deps,
        docker_rebuild=docker_rebuild,
    )
    _print_result("Sync complete", result)


@tools_app.command("update")
def tools_update(
    no_pull: bool = typer.Option(False, "--no-pull", help="Skip git pull"),
    branch: str | None = typer.Option(None, "--branch", "-b"),
    no_browser: bool = typer.Option(False, "--no-browser", help="Skip Playwright update"),
    no_restart: bool = typer.Option(False, "--no-restart", help="Sync only, do not restart panel"),
) -> None:
    """Sync software then restart panel (full update)."""
    result = run_update(
        pull=not no_pull,
        branch=branch,
        browser=not no_browser,
        restart_after=not no_restart,
    )
    _print_result("Update complete", result)


@tools_app.command("restart")
def tools_restart(
    docker: bool = typer.Option(False, "--docker", help="Force Docker Compose restart"),
    systemd: bool = typer.Option(False, "--systemd", help="Force systemd unit restart"),
) -> None:
    """Restart panel (Docker, systemd, or process on panel port)."""
    runtime: RuntimeKind | None = None
    if docker:
        runtime = RuntimeKind.DOCKER
    elif systemd:
        runtime = RuntimeKind.SYSTEMD
    result = run_restart(runtime=runtime)
    _print_result("Restart", result)


@tools_app.command("reset")
def tools_reset(
    scope: ResetScope = typer.Argument(
        ResetScope.CREDENTIALS,
        help="credentials | config | data | cache | all",
    ),
    yes: bool = typer.Option(
        False,
        "--yes",
        "-y",
        help="Confirm destructive reset (required for config/data/all)",
    ),
    no_regenerate: bool = typer.Option(
        False,
        "--keep-credentials",
        help="With config/data reset, do not rotate panel password",
    ),
) -> None:
    """
    Reset panel state.

    credentials — new username/password in .env

    config — restore example configs (backs up to *.bak)

    data — clear scrape output, cookies, products.db

    cache — remove __pycache__ under repo

    all — credentials + config + data + cache (requires --yes)
    """
    result = run_reset(
        scope,
        yes=yes,
        regenerate=not no_regenerate,
    )
    _print_result(f"Reset ({scope.value})", result)

    if result.access is not None:
        from config.credentials import print_panel_credentials

        access = result.access
        print_panel_credentials(
            access.username,
            access.password,
            access=access,
            mode="setup",
        )
