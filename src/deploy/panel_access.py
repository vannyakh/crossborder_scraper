"""aaPanel-style terminal summary after setup/install."""

from __future__ import annotations

from pathlib import Path

from rich.box import DOUBLE
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from deploy.network import PanelAccessInfo

_console = Console()


def configure_panel_bind(
    *,
    host: str | None = None,
    port: int | None = None,
    auto_port: bool = True,
    env_path: Path | None = None,
) -> tuple[str, int, bool]:
    """
    Write PANEL_HOST and PANEL_PORT to .env.

    Returns (bind_host, port, port_was_auto_adjusted).
    """
    from config.credentials import upsert_env_file
    from core.paths import env_file_path
    from deploy.network import normalize_bind_host, pick_panel_port

    path = env_path or env_file_path()
    bind = normalize_bind_host(host)
    preferred = port if port is not None else 8000
    adjusted = False
    if auto_port and port is None:
        preferred, adjusted = pick_panel_port(preferred)

    upsert_env_file(
        path,
        {
            "PANEL_HOST": bind,
            "PANEL_PORT": str(preferred),
            "PANEL_AUTH_ENABLED": "true",
        },
    )
    return bind, preferred, adjusted


def print_panel_access_card(
    info: PanelAccessInfo,
    *,
    mode: str = "setup",
    next_commands: list[str] | None = None,
) -> None:
    """Print install summary with URLs, IP, username, and password."""
    table = Table.grid(padding=(0, 2))
    table.add_column(style="bold cyan", justify="right")
    table.add_column(style="white")

    table.add_row("Bind address", f"{info.bind_host}:{info.port}")
    table.add_row("Panel URL", f"[link={info.primary_access_url}]{info.primary_access_url}[/link]")
    table.add_row("Login URL", f"[link={info.primary_login_url}]{info.primary_login_url}[/link]")
    table.add_row("Local URL", info.local_url)

    if info.lan_ips:
        for i, ip in enumerate(info.lan_ips):
            label = "Server IP" if i == 0 else ""
            url = f"http://{ip}:{info.port}/ui/"
            table.add_row(label, f"[link={url}]{url}[/link]")
    else:
        table.add_row("Server IP", "[dim]Could not detect — use Local URL or set --external[/dim]")

    if info.external_url:
        table.add_row("Public URL", f"[link={info.external_url}]{info.external_url}[/link]")

    table.add_row("", "")
    table.add_row("Username", f"[bold green]{info.username}[/bold green]")
    table.add_row("Password", f"[bold yellow]{info.password}[/bold yellow]")
    table.add_row("Saved in", info.env_path)

    if info.port_auto_adjusted:
        table.add_row("", "[yellow]Port 8000 was busy — using {0}[/yellow]".format(info.port))

    if info.credentials_generated:
        table.add_row("", "[dim]Save these credentials — they are not shown again.[/dim]")
    else:
        table.add_row("", "[dim]Using existing credentials from .env[/dim]")

    title = "Crossborder Scraper — Panel ready"
    if mode == "install":
        title = "Installation complete — Panel access"
    elif mode == "docker":
        title = "Docker setup complete — Panel access"

    _console.print()
    _console.print(
        Panel(
            table,
            title=f"[bold green]{title}[/bold green]",
            border_style="green",
            box=DOUBLE,
            padding=(1, 2),
        )
    )

    if next_commands:
        _console.print("[bold]Next steps:[/bold]")
        for cmd in next_commands:
            _console.print(f"  [cyan]{cmd}[/cyan]")
    _console.print()


def default_next_commands(mode: str) -> list[str]:
    if mode == "docker":
        return ["crossborder deploy up", "crossborder deploy status"]
    if mode in ("server", "install"):
        return ["crossborder serve --no-reload", "crossborder gateway"]
    return ["crossborder serve", "crossborder --help", "Open panel Login URL in your browser"]
