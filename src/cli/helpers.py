"""Shared CLI utilities."""

from __future__ import annotations

import asyncio
from typing import Any, Coroutine

from rich.console import Console
from rich.table import Table

console = Console()


def run_async(coro: Coroutine[Any, Any, Any]) -> Any:
    return asyncio.run(coro)


def print_product_table(product: Any) -> None:
    table = Table(title="Scraped product")
    table.add_column("Field")
    table.add_column("Value")
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

    console.print(f"[red]{exc}[/red]")
    console.print("[dim]Start API: uv run serve  or  bash scripts/serve-api.sh[/dim]")
    raise typer.Exit(1) from exc
