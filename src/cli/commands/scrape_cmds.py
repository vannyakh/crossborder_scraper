"""Scrape, export, and engine commands."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import typer
from rich.progress import BarColumn, Progress, TaskProgressColumn, TextColumn
from rich.table import Table

from cli.helpers import console, print_product_table, run_async
from config import get_settings
from core.browser import BrowserManager
from core.cookies import CookieManager
from core.engine import ScrapeEngine, ScrapeJob
from core.proxy import ProxyPool
from export.registry import get_exporter
from pipeline.normalize import to_export_listing
from pipeline.storage import ProductStore

LOGIN_URLS = {
    "1688": "https://login.1688.com/member/signin.htm",
    "taobao": "https://login.taobao.com/",
    "aliexpress": "https://login.aliexpress.com/",
}


def register_scrape_commands(app: typer.Typer) -> None:
    @app.command()
    def scrape(
        url: str = typer.Argument(..., help="Product URL from 1688, Taobao, or AliExpress"),
        save: bool = typer.Option(True, "--save/--no-save", help="Save to SQLite + JSON"),
        headed: bool = typer.Option(False, "--headed", help="Show browser window"),
        ai: bool = typer.Option(False, "--ai", help="Force AI extraction"),
    ) -> None:
        """Scrape a single product URL."""
        settings = get_settings()
        if headed:
            settings.headless = False

        async def _async() -> None:
            engine = ScrapeEngine(settings, max_workers=1)
            job = ScrapeJob(url=url, use_ai=ai if ai else None)
            async with engine:
                result = await engine.run_job(job)
            if result.status.value == "success" and result.product:
                print_product_table(result.product)
                if result.ai_used:
                    console.print("[cyan]Extracted with AI[/cyan]")
                if save:
                    store = ProductStore(settings)
                    row_id = store.save(result.product)
                    json_path = store.export_json_file(result.product)
                    console.print(f"[green]Saved[/green] db_id={row_id} json={json_path}")
            else:
                console.print(f"[red]Failed:[/red] {result.error}")
                raise typer.Exit(1)

        run_async(_async())

    @app.command()
    def login(
        site: str = typer.Argument(..., help="Site key: 1688, taobao, or aliexpress"),
        session: str = typer.Option("default", "--session", "-s", help="Cookie session name"),
    ) -> None:
        """Open browser for manual login; cookies are saved for future scrapes."""
        settings = get_settings()
        settings.headless = False
        site_lower = site.lower()
        if site_lower not in LOGIN_URLS:
            typer.echo(f"Unknown site. Choose from: {', '.join(LOGIN_URLS)}")
            raise typer.Exit(1)

        session_id = None if session == "default" else session

        async def _async() -> None:
            async with BrowserManager(settings, site_lower, session_id=session_id) as browser:
                page = await browser.new_page()
                await page.goto(LOGIN_URLS[site_lower])
                console.print(
                    f"[yellow]Log in manually (session={session}).[/yellow]\n"
                    "Press Enter when done to save cookies..."
                )
                await asyncio.get_event_loop().run_in_executor(None, input)
                console.print("[green]Cookies saved.[/green]")

        run_async(_async())

    @app.command()
    def export(
        url: str = typer.Argument(..., help="Product URL (must be scraped first unless --scrape)"),
        marketplace: str = typer.Argument(
            ...,
            help="Target: shopee | lazada | tiktok_shop | shopify",
        ),
        scrape_first: bool = typer.Option(False, "--scrape", help="Scrape URL before export"),
        dry_run: bool = typer.Option(False, "--dry-run", help="Build listing only, no API call"),
    ) -> None:
        """Export a product to a target marketplace."""
        settings = get_settings()
        store = ProductStore(settings)

        async def _async() -> None:
            product = store.get_by_url(url)
            if scrape_first or not product:
                engine = ScrapeEngine(settings, max_workers=1)
                async with engine:
                    result = await engine.run_job(ScrapeJob(url=url))
                if not result.product:
                    console.print(f"[red]Scrape failed:[/red] {result.error}")
                    raise typer.Exit(1)
                product = result.product
                store.save(product)

            listing = to_export_listing(product, settings)
            console.print_json(json.dumps(listing.model_dump(mode="json"), indent=2))

            if dry_run:
                console.print("[dim]Dry run — no API call[/dim]")
                return

            exporter = get_exporter(marketplace)  # type: ignore[arg-type]
            if not exporter.validate_credentials():
                console.print(
                    f"[red]Missing credentials for {marketplace}.[/red] "
                    "Set keys in panel Settings or config/ui_config.json."
                )
                raise typer.Exit(1)
            result = await exporter.publish(listing)
            console.print("[green]Export complete[/green]")
            console.print_json(json.dumps(result, indent=2, default=str))

        run_async(_async())

    @app.command("batch")
    def batch_scrape(
        file: Path = typer.Argument(..., help="Text file with one URL per line", exists=True),
        workers: int | None = typer.Option(None, "--workers", "-w", help="Concurrent jobs"),
        ai: bool = typer.Option(False, "--ai", help="Enable AI extraction"),
        no_save: bool = typer.Option(False, "--no-save", help="Skip DB/JSON save"),
    ) -> None:
        """Scrape multiple URLs concurrently via the scrape engine."""
        settings = get_settings()
        urls = [
            line.strip()
            for line in file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]
        if not urls:
            console.print("[red]No URLs in file[/red]")
            raise typer.Exit(1)

        async def _async() -> None:
            engine = ScrapeEngine(settings, max_workers=workers)
            console.print(
                f"[bold]Engine[/bold] jobs={len(urls)} workers={engine.max_workers} "
                f"proxies={engine.proxy_pool.size} ai={ai or settings.ai_enabled}"
            )

            with Progress(
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                console=console,
            ) as progress:
                task_id = progress.add_task("Scraping...", total=len(urls))

                def on_progress(done: int, _total: int, result: Any) -> None:
                    status = "[green]OK[/green]" if result.status.value == "success" else "[red]FAIL[/red]"
                    progress.update(task_id, completed=done, description=f"{status} {result.url[:50]}")

                report = await engine.run_batch(
                    [ScrapeJob(url=u, use_ai=ai if ai else None) for u in urls],
                    save=not no_save,
                    progress=on_progress,
                )

            table = Table(title="Batch report")
            table.add_column("Metric")
            table.add_column("Value")
            table.add_row("Total", str(report.total))
            table.add_row("Success", str(report.success))
            table.add_row("Failed", str(report.failed))
            table.add_row("Success rate", f"{report.success_rate:.1f}%")
            console.print(table)

            if report.failed:
                console.print("\n[red]Failed URLs:[/red]")
                for r in report.results:
                    if r.status.value == "failed":
                        console.print(f"  {r.url}: {r.error}")

        run_async(_async())

    @app.command("engine")
    def engine_info() -> None:
        """Show scrape engine configuration (workers, proxies, cookies, AI)."""
        settings = get_settings()
        pool = ProxyPool.from_settings(settings.proxy_server, settings.proxy_list_path)
        cookies = CookieManager(settings.cookies_dir)

        table = Table(title="Scrape Engine")
        table.add_column("Setting")
        table.add_column("Value")
        for key, val in [
            ("max_concurrent_jobs", str(settings.max_concurrent_jobs)),
            ("proxy_list", str(settings.proxy_list_path)),
            ("proxies loaded", str(pool.size)),
            ("proxy_rotation", settings.proxy_rotation_strategy),
            ("single proxy", settings.proxy_server or "—"),
            ("ai_enabled", str(settings.ai_enabled)),
            ("ai_fallback", str(settings.ai_fallback)),
            ("ai_model", settings.ai_model),
            ("ai_base_url", settings.ai_base_url),
            ("cookies_dir", str(settings.cookies_dir)),
        ]:
            table.add_row(key, val)
        console.print(table)

        sessions: list[str] = []
        for site in ("1688", "taobao", "aliexpress"):
            for s in cookies.list_sessions(site):
                sessions.append(f"{site}/{s}")
        if sessions:
            console.print("\n[bold]Cookie sessions:[/bold]", ", ".join(sessions))
        else:
            console.print("\n[dim]No saved cookies. Run: scraper login 1688[/dim]")

    @app.command()
    def sites() -> None:
        """List supported source sites, source plugins, and export targets."""
        from core.plugins import list_source_catalog

        table = Table(title="Platforms")
        table.add_column("Type")
        table.add_column("Key")
        table.add_column("Notes")
        for row in [
            ("Site", "1688", "B2B wholesale — Playwright + cookies"),
            ("Site", "taobao", "B2C — login cookies"),
            ("Site", "aliexpress", "Cross-border retail"),
        ]:
            table.add_row(*row)

        for entry in list_source_catalog():
            if entry.get("kind") == "source":
                table.add_row(
                    "Source plugin",
                    str(entry.get("id")),
                    str(entry.get("description", ""))[:60],
                )

        for row in [
            ("Export", "shopee", "Shopee Open Platform API"),
            ("Export", "lazada", "Lazada Open Platform API"),
            ("Export", "tiktok_shop", "TikTok Shop Partner API"),
            ("Export", "shopify", "Shopify Admin REST API"),
        ]:
            table.add_row(*row)
        console.print(table)
