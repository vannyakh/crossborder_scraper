"""Shared CLI utilities."""

from __future__ import annotations

import asyncio
from collections.abc import Coroutine
from typing import Any

from rich.table import Table

from cli.theme import cmd, console, err, hint

__all__ = ["console", "run_async", "print_product_table", "gateway_client", "exit_gateway_error"]


def run_async(coro: Coroutine[Any, Any, Any]) -> Any:
    return asyncio.run(coro)


def print_product_table(product: Any) -> None:
    table = Table(title="Scraped product", border_style="bright_blue")
    table.add_column("Field", style="label")
    table.add_column("Value", style="value")
    table.add_row("Source", product.source.value)
    table.add_row("ID", product.source_product_id)
    table.add_row("Title", product.title[:80])
    table.add_row("Price", str(product.price))
    table.add_row("Images", str(len(product.images)))
    table.add_row("URL", product.source_url)
    console.print(table)


def gateway_client(url: str | None = None):
    from gateway.client import GatewayClient

    return GatewayClient.from_env(url)


def exit_gateway_error(exc: Exception) -> None:
    import typer

    console.print(err(str(exc)))
    console.print(hint("Start panel: ") + cmd("uv run crossborder serve --no-reload"))
    raise typer.Exit(1) from exc
