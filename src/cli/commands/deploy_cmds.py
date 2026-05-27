"""Self-hosting deploy commands"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.table import Table

from cli.helpers import console, gateway_client
from cli.onboard import print_onboard_banner, print_setup_progress
from cli.theme import err, hint, ok, warn
from config import get_settings
from core.paths import repo_root
from deploy.bootstrap import run_setup
from deploy.docker_compose import compose_down, compose_status, compose_up, docker_ready
from deploy.platform import detect_platform
from deploy.templates import nginx_site, systemd_unit, write_template

deploy_app = typer.Typer(help="Self-host on VPS, Docker, or bare metal (cross-platform)")


def register_deploy_commands(app: typer.Typer) -> None:
    app.add_typer(deploy_app, name="deploy")


@deploy_app.command("setup")
def deploy_setup(
    mode: str = typer.Option(
        "server",
        "--mode",
        "-m",
        help="panel | server | docker",
    ),
    regenerate: bool = typer.Option(False, "--regenerate", help="New panel password"),
    skip_browser: bool = typer.Option(False, "--skip-browser", help="Skip Playwright install"),
    host: str = typer.Option("0.0.0.0", "--host", help="Bind address"),
    port: int | None = typer.Option(None, "--port", "-p", help="Panel port"),
    external: str | None = typer.Option(
        "auto",
        "--external",
        "-e",
        help="Public IP/domain for URLs (default: auto-detect)",
    ),
) -> None:
    """
    Bootstrap install (dirs, config, credentials, deps).

    Use before first `serve` or `deploy up` on a new machine.
    Same as `scraper setup --server` but explicit for production.
    """
    if skip_browser and mode == "server":
        mode = "panel"

    card_mode = "install" if mode == "server" else mode
    print_onboard_banner(mode=card_mode)

    result = run_setup(
        mode=mode,
        regenerate=regenerate,
        bind_host=host,
        port=port,
        external_host=external,
    )

    print_setup_progress(list(result["steps"]), warnings=list(result["warnings"]))

    from config.credentials import print_panel_credentials
    from deploy.panel_access import default_next_commands

    print_panel_credentials(
        str(result["username"]),
        str(result["password"]),
        access=result["access"],
        mode=card_mode,
        next_commands=default_next_commands(card_mode),
    )


@deploy_app.command("run")
def deploy_run(
    setup: bool = typer.Option(
        False,
        "--setup",
        help="Run full bootstrap (dirs, deps, Playwright) before starting",
    ),
    host: str = typer.Option(
        "0.0.0.0",
        "--host",
        help="TCP bind address (0.0.0.0 = LAN + public)",
    ),
    port: int | None = typer.Option(None, "--port", "-p", help="Panel TCP port (default 8787)"),
    external: str = typer.Option(
        "auto",
        "--external",
        "-e",
        help="Public IP/domain for login URLs (auto-detect if omitted)",
    ),
    regenerate: bool = typer.Option(False, "--regenerate", help="New panel password"),
    reload: bool = typer.Option(
        False,
        "--reload/--no-reload",
        help="Dev auto-reload (production: use --no-reload)",
    ),
) -> None:
    """
    Start the panel TCP server (bind 0.0.0.0) with auto public IP in the access card.

    First time on a machine:  crossborder deploy run --setup
    Already configured:     crossborder deploy run
    """
    from config.credentials import print_panel_credentials
    from deploy.bootstrap import run_setup
    from deploy.panel_access import build_access_from_env, default_next_commands

    print_onboard_banner(mode="server")

    if setup:
        result = run_setup(
            mode="server",
            regenerate=regenerate,
            bind_host=host,
            port=port,
            auto_port=True,
            external_host=external,
        )
        print_setup_progress(list(result["steps"]), warnings=list(result["warnings"]))
        access = result["access"]
    else:
        from deploy.panel_access import configure_panel_bind, persist_external_host

        configure_panel_bind(host=host, port=port, auto_port=port is None)
        persist_external_host(external)
        access = build_access_from_env()

    print_panel_credentials(
        str(access.username),
        str(access.password),
        access=access,
        mode="server",
        next_commands=default_next_commands("server"),
    )

    import os

    from cli.theme import brand, hint, link_markup

    settings = get_settings()
    login_host = "127.0.0.1" if settings.panel_host in ("0.0.0.0", "::") else settings.panel_host
    login = f"http://{login_host}:{settings.panel_port}/ui/login"

    console.print()
    console.print(brand("Starting panel TCP server…"))
    console.print(hint(f"  Bind: {settings.panel_host}:{settings.panel_port}"))
    console.print(hint(f"  Login: {link_markup(login)}"))
    console.print(hint("  Press Ctrl+C to stop"))
    console.print()

    os.environ["UVICORN_RELOAD"] = "1" if reload else "0"
    from server.__main__ import main

    main()


@deploy_app.command("status")
def deploy_status(
    url: str | None = typer.Option(None, "--url", help="Panel URL for health check"),
) -> None:
    """Show platform, Docker, and gateway health."""
    plat = detect_platform()
    table = Table(title="Host", border_style="bright_blue")
    table.add_column("Key")
    table.add_column("Value")
    table.add_row("OS", f"{plat.system} / {plat.machine}")
    table.add_row("Docker", "yes" if plat.has_docker else "no")
    table.add_row("Compose", "yes" if plat.has_compose else "no")
    table.add_row("uv", "yes" if plat.has_uv else "no")
    table.add_row("systemd", "yes" if plat.has_systemd else "no")
    table.add_row("Repo", str(repo_root()))
    console.print(table)

    settings = get_settings()
    console.print(f"\n[bold]Configured panel:[/bold] {settings.panel_host}:{settings.panel_port}")

    try:
        health = gateway_client(url).health()
        console.print(ok(f"API health: {health}"))
    except Exception as exc:
        console.print(warn(f"API not reachable: {exc}"))
        console.print(hint("Start: uv run crossborder serve  or  uv run crossborder deploy up"))


@deploy_app.command("up")
def deploy_up(
    build: bool = typer.Option(True, "--build/--no-build", help="Build image before start"),
    setup_first: bool = typer.Option(True, "--setup/--no-setup", help="Run deploy setup first"),
) -> None:
    """Start production stack with Docker Compose."""
    if not docker_ready():
        console.print(err("Docker Compose not available"))
        raise typer.Exit(1)

    if setup_first:
        result = run_setup(mode="docker", regenerate=False)
    else:
        result = None

    code = compose_up(detach=True, build=build)
    if code != 0:
        raise typer.Exit(code)

    if result:
        from config.credentials import print_panel_credentials

        print_panel_credentials(
            str(result["username"]),
            str(result["password"]),
            access=result["access"],
            mode="docker",
        )
    else:
        settings = get_settings()
        host = "127.0.0.1" if settings.panel_host in ("0.0.0.0", "::") else settings.panel_host
        console.print(f"[green]Stack running[/green] → http://{host}:{settings.panel_port}/ui/")


@deploy_app.command("down")
def deploy_down() -> None:
    """Stop Docker Compose stack."""
    raise typer.Exit(compose_down())


@deploy_app.command("ps")
def deploy_ps() -> None:
    """Docker Compose service status."""
    raise typer.Exit(compose_status())


@deploy_app.command("systemd")
def deploy_systemd(
    user: str = typer.Option("www-data", "--user", "-u", help="Service user"),
    port: int | None = typer.Option(None, "--port", "-p", help="Panel port"),
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Write unit file path (default: deploy/crossborder-scraper.service)",
    ),
    install: bool = typer.Option(
        False,
        "--install",
        help="Copy to /etc/systemd/system (requires root)",
    ),
) -> None:
    """Generate systemd unit for always-on panel (like aaPanel service)."""
    settings = get_settings()
    port = port or settings.panel_port
    out = output or (repo_root() / "deploy" / "crossborder-scraper.service")
    content = systemd_unit(user=user, port=port)
    write_template(out, content)
    console.print(f"[green]Wrote[/green] {out}")

    console.print(
        "\n[dim]Manual steps:[/dim]\n"
        f"  sudo cp {out} /etc/systemd/system/\n"
        "  sudo systemctl daemon-reload\n"
        "  sudo systemctl enable --now crossborder-scraper\n"
    )

    if install:
        import shutil
        import subprocess

        dest = Path("/etc/systemd/system/crossborder-scraper.service")
        if not plat_writeable(dest):
            console.print("[red]Need root for --install[/red]")
            raise typer.Exit(1)
        shutil.copy2(out, dest)
        subprocess.run(["systemctl", "daemon-reload"], check=True)
        subprocess.run(["systemctl", "enable", "--now", "crossborder-scraper"], check=True)
        console.print("[green]Service installed and started[/green]")


@deploy_app.command("nginx")
def deploy_nginx(
    server_name: str = typer.Option("_", "--server-name", "-n"),
    port: int | None = typer.Option(None, "--port", "-p"),
    ssl: bool = typer.Option(False, "--ssl", help="Generate SSL server block template"),
    output: Path | None = typer.Option(None, "--output", "-o"),
) -> None:
    """Print/write nginx reverse-proxy snippet (TLS termination on host)."""
    settings = get_settings()
    port = port or settings.panel_port
    out = output or (repo_root() / "deploy" / "nginx-crossborder-scraper.conf")
    content = nginx_site(server_name=server_name, upstream_port=port, ssl=ssl)
    write_template(out, content)
    console.print(f"[green]Wrote[/green] {out}")
    console.print("[dim]Include in aaPanel / nginx sites-enabled, then nginx -t && reload[/dim]")


def plat_writeable(path: Path) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        test = path.parent / ".write_test"
        test.write_text("x")
        test.unlink()
        return True
    except OSError:
        return False
