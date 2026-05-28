"""Onboarding UI for setup / install — banners, steps, quick-start."""

from __future__ import annotations

from rich.box import ROUNDED
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from cli.theme import cmd, console, hint, panel_border_style, warn

STEP_LABELS: dict[str, str] = {
    "directories": "Create data & config folders",
    "config": "Seed configuration files",
    "env": "Panel port, host & login credentials",
    "python_deps": "Install Python dependencies",
    "playwright": "Install Playwright Chromium",
    "deploy_env_example": "Write Docker deploy template",
}


def print_onboard_banner(*, mode: str = "server") -> None:
    """Top banner for setup / install."""
    subtitle = {
        "panel": "Quick panel credentials",
        "server": "Full self-host install",
        "docker": "Docker production prep",
        "install": "Installation complete",
    }.get(mode, "Setup")

    art = Text()
    art.append("Cross-Border", style="bold bright_blue")
    art.append(" Scraper", style="white")
    art.append(f"\n{subtitle}", style="dim")

    console.print()
    console.print(
        Panel(
            art,
            border_style=panel_border_style(),
            box=ROUNDED,
            padding=(0, 2),
        )
    )
    console.print()


def print_setup_progress(steps: list[str], *, warnings: list[str]) -> None:
    """Checklist of completed bootstrap steps."""
    if not steps:
        return
    table = Table(
        title="Setup progress",
        show_header=False,
        box=ROUNDED,
        border_style="dim",
        padding=(0, 1),
    )
    table.add_column("", width=3, style="step.done")
    table.add_column("Step", style="white")
    for key in steps:
        label = STEP_LABELS.get(key, key.replace("_", " ").title())
        table.add_row("[ok]+[/ok]", label)
    console.print(table)
    if warnings:
        console.print()
        for w in warnings:
            console.print(warn(f"  ! {w}"))
    console.print()


def print_mode_footer(mode: str) -> None:
    if mode == "panel":
        console.print(hint("  Full install: ") + cmd("curl -fsSL …/scripts/install.sh | bash"))
        console.print(hint("  Or:           ") + cmd("crossborder setup --server"))
    elif mode == "docker":
        console.print(hint("  Next: ") + cmd("crossborder deploy up"))
