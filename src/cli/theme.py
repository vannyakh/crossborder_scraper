"""Shared Rich theme and terminal styling for the Crossborder CLI."""

from __future__ import annotations

from rich.console import Console
from rich.style import Style
from rich.theme import Theme

# Brand-aligned palette (works on light & dark terminals)
THEME = Theme(
    {
        "brand": "bold bright_blue",
        "brand.dim": "dim bright_blue",
        "accent": "cyan",
        "success": "bold green",
        "ok": "green",
        "warn": "bold yellow",
        "error": "bold red",
        "muted": "dim",
        "label": "bold cyan",
        "value": "white",
        "cmd": "bold bright_cyan",
        "link": "underline bright_blue",
        "secret": "bold yellow",
        "user": "bold green",
        "step.done": "green",
        "step.pending": "dim",
    }
)

console = Console(theme=THEME, highlight=False)


def brand(text: str) -> str:
    return f"[brand]{text}[/brand]"


def ok(text: str) -> str:
    return f"[success]{text}[/success]"


def warn(text: str) -> str:
    return f"[warn]{text}[/warn]"


def err(text: str) -> str:
    return f"[error]{text}[/error]"


def hint(text: str) -> str:
    return f"[muted]{text}[/muted]"


def cmd(text: str) -> str:
    return f"[cmd]{text}[/cmd]"


def user(text: str) -> str:
    return f"[user]{text}[/user]"


def secret(text: str) -> str:
    return f"[secret]{text}[/secret]"


def link_markup(url: str, label: str | None = None) -> str:
    display = label or url
    return f"[link={url}]{display}[/link]"


def panel_border_style() -> str:
    return "bright_blue"


def header_style() -> Style:
    return Style(color="bright_blue", bold=True)
