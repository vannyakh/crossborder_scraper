"""Panel service lifecycle — start, stop, status, logs (local process)."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import typer
from rich.table import Table

from cli.helpers import console, gateway_client
from cli.theme import err, hint, ok, warn
from config import get_settings
from core.paths import repo_root

service_app = typer.Typer(
    help="Run and control the panel API process (local / VPS foreground or background)",
)


def _panel_log_path() -> Path:
    return repo_root() / "data" / "panel.log"


def _panel_pid_on_port(port: int) -> int | None:
    if sys.platform == "win32":
        return None
    try:
        out = subprocess.run(
            ["lsof", "-t", f"-i:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            check=False,
        )
        line = (out.stdout or "").strip().splitlines()
        if line:
            return int(line[0])
    except (FileNotFoundError, ValueError, OSError):
        pass
    return None


def register_service_commands(app: typer.Typer) -> None:
    app.add_typer(service_app, name="service")


@service_app.command("status")
def service_status(
    url: str | None = typer.Option(None, "--url", help="Panel URL for health check"),
) -> None:
    """Show panel process, port listen, and API health."""
    settings = get_settings()
    port = settings.panel_port
    pid = _panel_pid_on_port(port)
    log = _panel_log_path()

    table = Table(title="Panel service", border_style="bright_blue")
    table.add_column("Key")
    table.add_column("Value")
    table.add_row("Bind", f"{settings.panel_host}:{port}")
    table.add_row("PID", str(pid) if pid else "(not listening)")
    table.add_row("Log", str(log))
    console.print(table)

    try:
        health = gateway_client(url).health()
        if health.get("status") == "ok":
            console.print(ok("API health: ok"))
        else:
            console.print(warn(f"API health: {health}"))
    except Exception as exc:
        console.print(warn(f"API not reachable: {exc}"))
        console.print(hint("Start: crossborder service start"))


@service_app.command("start")
def service_start(
    foreground: bool = typer.Option(
        False,
        "--foreground/--background",
        "-f/-b",
        help="Run in foreground (default: background nohup)",
    ),
    reload: bool = typer.Option(False, "--reload", help="Dev auto-reload (foreground only)"),
) -> None:
    """Start the panel API (background nohup or foreground)."""
    settings = get_settings()
    port = settings.panel_port
    if _panel_pid_on_port(port):
        console.print(warn(f"Panel already listening on port {port}"))
        raise typer.Exit(0)

    if foreground:
        os.environ["UVICORN_RELOAD"] = "1" if reload else "0"
        from server.__main__ import main

        console.print(ok(f"Starting panel on {settings.panel_host}:{port} (Ctrl+C to stop)"))
        main()
        return

    log = _panel_log_path()
    log.parent.mkdir(parents=True, exist_ok=True)
    root = repo_root()
    cb = root / ".venv" / "bin" / "crossborder"
    if not cb.is_file():
        import shutil

        found = shutil.which("crossborder")
        if not found:
            console.print(err("crossborder CLI not found — run uv sync in repo root"))
            raise typer.Exit(1)
        cb = Path(found)
    cmd = [str(cb), "serve", "--no-reload"]
    env = os.environ.copy()
    env["PATH"] = f"{root / '.venv' / 'bin'}:{env.get('PATH', '')}"

    with open(log, "a", encoding="utf-8") as logfh:
        proc = subprocess.Popen(
            cmd,
            cwd=root,
            stdout=logfh,
            stderr=subprocess.STDOUT,
            env=env,
            start_new_session=True,
        )

    console.print(ok(f"Started panel PID {proc.pid} (log: {log})"))
    for _ in range(10):
        time.sleep(1)
        if gateway_client().probe():
            console.print(ok(f"Health OK on port {port}"))
            console.print(hint(f"Login: http://127.0.0.1:{port}/ui/login"))
            return
    console.print(warn("Panel not responding yet — check log:"))
    console.print(hint(f"  tail -f {log}"))


@service_app.command("stop")
def service_stop(
    port: int | None = typer.Option(None, "--port", "-p", help="Panel port (default from .env)"),
) -> None:
    """Stop the panel process listening on the panel port."""
    settings = get_settings()
    chosen = port or settings.panel_port
    pid = _panel_pid_on_port(chosen)
    if not pid:
        console.print(warn(f"No process listening on port {chosen}"))
        raise typer.Exit(0)
    try:
        os.kill(pid, signal.SIGTERM)
        console.print(ok(f"Stopped panel PID {pid}"))
    except OSError as exc:
        console.print(err(f"Could not stop PID {pid}: {exc}"))
        raise typer.Exit(1) from exc


@service_app.command("restart")
def service_restart(
    foreground: bool = typer.Option(False, "--foreground", "-f", help="Restart in foreground"),
) -> None:
    """Stop then start the panel process."""
    try:
        service_stop(port=None)
    except typer.Exit:
        pass
    time.sleep(1)
    service_start(foreground=foreground, reload=False)


@service_app.command("logs")
def service_logs(
    lines: int = typer.Option(40, "--lines", "-n", help="Tail line count"),
    follow: bool = typer.Option(False, "--follow", "-f", help="Follow log output"),
) -> None:
    """Tail panel background log (data/panel.log)."""
    log = _panel_log_path()
    if not log.is_file():
        console.print(warn(f"No log file at {log}"))
        console.print(hint("Start background panel: crossborder service start"))
        raise typer.Exit(1)

    if follow:
        if sys.platform == "win32":
            console.print(warn("--follow not supported on Windows; showing last lines"))
            follow = False
        else:
            subprocess.run(["tail", "-f", str(log)], check=False)
            return

    text = log.read_text(encoding="utf-8", errors="replace").splitlines()
    for line in text[-lines:]:
        console.print(line)
