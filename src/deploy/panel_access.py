"""Panel install card — terminal summary after setup/install."""

from __future__ import annotations

from pathlib import Path

from rich.box import ROUNDED
from rich.columns import Columns
from rich.panel import Panel
from rich.table import Table

from cli.theme import (
    brand,
    cmd,
    console,
    hint,
    link_markup,
    panel_border_style,
    secret,
    user,
    warn,
)
from deploy.network import DEFAULT_PANEL_PORT, PanelAccessInfo, resolve_external_host


def _print_compact_urls(info: PanelAccessInfo) -> None:
    parts = [
        link_markup(info.primary_login_url, "Login"),
        link_markup(info.local_url, "Local"),
    ]
    if info.external_url:
        parts.append(link_markup(info.external_url, "Public"))
    console.print(Columns(parts, padding=(1, 2)))


def _print_quick_start(info: PanelAccessInfo, *, mode: str) -> None:
    from core.paths import ui_is_built

    serve = cmd("crossborder serve --no-reload")
    login = link_markup(info.primary_login_url, info.primary_login_url)
    if mode == "install":
        lines = [
            f"1. Open login in browser:       {login}",
            f"2. Sign in with username above  {user(info.username)}",
            hint("   Panel runs in background after install.sh — use crossborder deploy status"),
            hint("   CLI from any terminal:        crossborder --help"),
        ]
    else:
        lines = [
            f"1. Start the panel (required):  {serve}",
            f"2. Open login in browser:       {login}",
            f"3. Sign in with username above  {user(info.username)}",
        ]
        if not ui_is_built():
            lines.insert(
                2,
                hint("   Dev UI: run bash scripts/dev-ui.sh in a second terminal (Vite on :5173)"),
            )
        if mode in ("server",):
            lines.append(hint("   CLI: crossborder --help  (after install.sh)"))
    console.print(
        Panel(
            "\n".join(lines),
            title=brand("Quick start"),
            border_style="green",
            box=ROUNDED,
            padding=(1, 2),
        )
    )
    console.print()


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
    preferred = port if port is not None else DEFAULT_PANEL_PORT
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
    from deploy.panel_security import ensure_panel_entrance

    ensure_panel_entrance(path)
    return bind, preferred, adjusted


def persist_external_host(
    external: str | None,
    *,
    env_path: Path | None = None,
) -> str | None:
    """Resolve and write PANEL_EXTERNAL_HOST to .env (``auto`` detects public IP)."""
    from config.credentials import upsert_env_file
    from core.paths import env_file_path

    resolved = resolve_external_host(external)
    if not resolved:
        return None
    path = env_path or env_file_path()
    upsert_env_file(path, {"PANEL_EXTERNAL_HOST": resolved})
    return resolved


def build_access_from_env(
    *,
    external: str | None = None,
    env_path: Path | None = None,
) -> PanelAccessInfo:
    """Build access card info from current .env (optional external refresh)."""
    from config import get_settings
    from config.credentials import ensure_panel_credentials
    from core.paths import env_file_path
    from deploy.network import build_panel_access_info, resolve_external_host

    path = env_path or env_file_path()
    settings = get_settings()
    username, password, _generated = ensure_panel_credentials(path, force_regenerate=False)
    from deploy.panel_security import normalize_entry_path

    entry = normalize_entry_path(settings.panel_entry_path)
    access_key = (settings.panel_access_key or "").strip() or None
    if external is not None:
        ext = persist_external_host(external, env_path=path)
    else:
        stored = settings.panel_external_host
        ext = stored.strip() if stored else None
        if not ext:
            ext = resolve_external_host("auto")
            if ext:
                persist_external_host(ext, env_path=path)
    return build_panel_access_info(
        username=username,
        password=password,
        bind_host=settings.panel_host,
        port=settings.panel_port,
        credentials_generated=False,
        env_path=str(path),
        external_host=ext,
        entry_path=entry,
        access_key=access_key,
        public_http_port=settings.panel_public_http_port,
    )


def _access_table(info: PanelAccessInfo) -> Table:
    table = Table.grid(padding=(0, 2))
    table.add_column(style="label", justify="right", min_width=12)
    table.add_column(style="value")

    table.add_row("Bind", f"{info.bind_host}:{info.port}")
    if info.security_entrance_enabled:
        table.add_row("Entrance", hint(f"/{info.entry_path}/  (IP:port alone returns 404)"))
        if info.access_key:
            table.add_row("Access key", secret(info.access_key))
        if info.entrance_access_url:
            table.add_row("Panel URL", link_markup(info.entrance_access_url))
    table.add_row("Login", link_markup(info.primary_login_url))
    table.add_row("Local", link_markup(info.local_url))

    if info.lan_ips:
        for i, ip in enumerate(info.lan_ips):
            label = "LAN" if i == 0 else ""
            from deploy.panel_security import build_entrance_url

            url = build_entrance_url(ip, info.port, info.entry_path)
            table.add_row(label, link_markup(url))

    if info.external_url:
        table.add_row("Public", link_markup(info.external_url))

    table.add_row("", "")
    table.add_row("Username", user(info.username))
    table.add_row("Password", secret(info.password))
    table.add_row(".env", hint(info.env_path))

    if info.port_auto_adjusted:
        table.add_row(
            "",
            warn(f"Port {DEFAULT_PANEL_PORT} was busy — using {info.port}"),
        )

    if info.credentials_generated:
        table.add_row(
            "",
            hint("Save login URL, access key, and password now — not shown again"),
        )
    else:
        table.add_row("", hint("Using existing credentials from .env"))
    if info.security_entrance_enabled:
        table.add_row(
            "",
            hint("Open the Login URL (includes access key) — bare IP:port shows 404"),
        )

    return table


def print_panel_access_card(
    info: PanelAccessInfo,
    *,
    mode: str = "setup",
    next_commands: list[str] | None = None,
    show_quick_start: bool = True,
) -> None:
    """Print install summary with URLs, IP, username, and password."""
    title_map = {
        "setup": "Panel ready",
        "install": "Installation complete",
        "server": "Self-host ready",
        "docker": "Docker setup complete",
        "panel": "Panel credentials",
    }
    title = title_map.get(mode, "Panel ready")

    console.print()
    if mode == "server":
        console.print(
            Panel(
                warn("URLs work only while the panel server is running")
                + "\n"
                + hint("Run: crossborder serve --no-reload  (or re-run install.sh to auto-start)"),
                border_style="yellow",
                box=ROUNDED,
                padding=(0, 1),
            )
        )
        console.print()

    console.print(
        Panel(
            _access_table(info),
            title=brand(title),
            border_style=panel_border_style(),
            box=ROUNDED,
            padding=(1, 2),
        )
    )

    _print_compact_urls(info)

    if next_commands:
        console.print()
        console.print(brand("Commands"))
        for line in next_commands:
            console.print(f"  {line}")

    if show_quick_start and mode in ("server", "install", "setup", "panel"):
        _print_quick_start(info, mode=mode)

    console.print()


def default_next_commands(mode: str) -> list[str]:
    from cli.theme import cmd

    serve = cmd("crossborder service start")
    agent = cmd("crossborder chat")
    if mode == "docker":
        return [cmd("crossborder deploy up"), cmd("crossborder deploy status")]
    if mode == "install":
        return [
            cmd("crossborder service status"),
            cmd("crossborder gateway"),
            agent,
            cmd("crossborder --help"),
        ]
    if mode == "server":
        return [serve, cmd("crossborder gateway"), agent]
    return [serve, cmd("crossborder --help")]


def print_install_finish_card(
    info: PanelAccessInfo,
    *,
    install_dir: str | None = None,
    panel_port: int | None = None,
) -> None:
    """Plain-text install finish — panel URL, access key, username, password."""
    import os
    import sys

    verbose = os.environ.get("CROSSBORDER_INSTALL_VERBOSE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    width = 76
    border = "=" * width
    out = sys.stdout

    out.write("\n")
    out.write(f"{border}\n")
    out.write(f"{'Cross-Border — Installation complete':^{width}}\n")
    out.write(f"{border}\n\n")

    if info.security_entrance_enabled and info.entrance_access_url:
        out.write(f"  Panel URL:   {info.entrance_access_url}\n")
        out.write(f"  Login URL:   {info.primary_login_url}\n")
        if info.access_key:
            out.write(f"  Access key:  {info.access_key}\n")
        out.write("\n")
        out.write("  Direct /ui/login without the entrance path returns 404.\n")
    else:
        panel_url = info.external_url or info.local_url
        out.write(f"  Panel URL:   {panel_url}\n")
        out.write(f"  Login URL:   {info.primary_login_url}\n")

    out.write(f"  Username:    {info.username}\n")
    out.write(f"  Password:    {info.password}\n")
    out.write("\n")
    out.write("  Save this card — credentials are not shown again.\n")

    root = install_dir or str(Path(info.env_path).parent)
    cli_bin = f"{root}/.venv/bin/crossborder"
    out.write("\n")
    out.write("  CLI on this server:\n")
    out.write("    source ~/.bashrc && crossborder service status\n")
    out.write(f"    Or: {cli_bin} --help\n")

    if verbose:
        out.write("\n")
        out.write(f"  Install dir: {root}\n")
        port = panel_port or info.port
        out.write(f"  Panel port:  {port}\n")
        out.write(f"  Logs:        {root}/data/panel.log\n")
        out.write("  Update:      crossborder tools update\n")
        out.write("  Docs:        docs/INSTALL.md\n")

    out.write(f"\n{border}\n\n")
