import asyncio
import json
from typing import Any, Coroutine

import typer
from rich.console import Console
from rich.progress import BarColumn, Progress, TaskProgressColumn, TextColumn
from rich.table import Table

from config import get_settings
from core.browser import BrowserManager
from core.cookies import CookieManager
from core.engine import ScrapeEngine, ScrapeJob
from core.proxy import ProxyPool
from export.registry import get_exporter
from pipeline.normalize import to_export_listing
from pipeline.storage import ProductStore

console = Console()


def _run(coro: Coroutine[Any, Any, Any]) -> Any:
    """Run an async command from sync Typer handlers."""
    return asyncio.run(coro)


def build_app() -> typer.Typer:
    app = typer.Typer(
        name="scraper",
        help="Scrape 1688/Taobao/AliExpress and export to Shopee, Lazada, TikTok Shop, Shopify",
        no_args_is_help=True,
    )

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
                _print_product(result.product)
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

        _run(_async())

    @app.command()
    def login(
        site: str = typer.Argument(..., help="Site key: 1688, taobao, or aliexpress"),
        session: str = typer.Option("default", "--session", "-s", help="Cookie session name"),
    ) -> None:
        """Open browser for manual login; cookies are saved for future scrapes."""
        settings = get_settings()
        settings.headless = False

        login_urls = {
            "1688": "https://login.1688.com/member/signin.htm",
            "taobao": "https://login.taobao.com/",
            "aliexpress": "https://login.aliexpress.com/",
        }
        site_lower = site.lower()
        if site_lower not in login_urls:
            typer.echo(f"Unknown site. Choose from: {', '.join(login_urls)}")
            raise typer.Exit(1)

        session_id = None if session == "default" else session

        async def _async() -> None:
            async with BrowserManager(settings, site_lower, session_id=session_id) as browser:
                page = await browser.new_page()
                await page.goto(login_urls[site_lower])
                console.print(
                    f"[yellow]Log in manually (session={session}).[/yellow]\n"
                    "Press Enter when done to save cookies..."
                )
                await asyncio.get_event_loop().run_in_executor(None, input)
                console.print("[green]Cookies saved.[/green]")

        _run(_async())

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
                    "Copy .env.example to .env and fill API keys."
                )
                raise typer.Exit(1)
            result = await exporter.publish(listing)
            console.print("[green]Export complete[/green]")
            console.print_json(json.dumps(result, indent=2, default=str))

        _run(_async())

    @app.command("batch")
    def batch_scrape(
        file: str = typer.Argument(..., help="Text file with one URL per line"),
        workers: int = typer.Option(None, "--workers", "-w", help="Concurrent jobs (default from .env)"),
        ai: bool = typer.Option(False, "--ai", help="Enable AI extraction"),
        no_save: bool = typer.Option(False, "--no-save", help="Skip DB/JSON save"),
    ) -> None:
        """Scrape multiple URLs concurrently via the scrape engine."""
        settings = get_settings()
        urls = [
            line.strip()
            for line in open(file, encoding="utf-8")
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

        _run(_async())

    @app.command()
    def setup(
        regenerate: bool = typer.Option(
            False,
            "--regenerate",
            help="Generate new panel username/password even if .env already has them",
        ),
    ) -> None:
        """Initialize .env with auto-generated panel login credentials."""
        from config.credentials import ensure_panel_credentials, print_panel_credentials

        username, password, generated = ensure_panel_credentials(force_regenerate=regenerate)
        print_panel_credentials(username, password)
        if not generated and not regenerate:
            console.print("[yellow]Panel credentials already in .env[/yellow]")
        else:
            console.print("[green]Credentials written to .env[/green]")

    @app.command("env-clean")
    def env_clean() -> None:
        """Move UI prefs to config/ui_config.json and remove them from .env."""
        from config.credentials import clean_env_file
        from config.ui_store import UI_CONFIG_PATH, load_ui_config

        load_ui_config()
        removed = clean_env_file()
        if removed:
            console.print(
                f"[green]Removed {len(removed)} UI key(s) from .env[/green]: {', '.join(removed)}"
            )
            console.print(f"[dim]Preferences stored in {UI_CONFIG_PATH}[/dim]")
        else:
            console.print("[yellow].env already clean — no UI preference keys found[/yellow]")

    @app.command("engine")
    def engine_info() -> None:
        """Show scrape engine configuration (workers, proxies, cookies, AI)."""
        settings = get_settings()
        pool = ProxyPool.from_settings(settings.proxy_server, settings.proxy_list_path)
        cookies = CookieManager(settings.cookies_dir)

        table = Table(title="Scrape Engine")
        table.add_column("Setting")
        table.add_column("Value")
        rows = [
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
        ]
        for row in rows:
            table.add_row(*row)
        console.print(table)

        sessions: list[str] = []
        for site in ("1688", "taobao", "aliexpress"):
            for s in cookies.list_sessions(site):
                sessions.append(f"{site}/{s}")
        if sessions:
            console.print("\n[bold]Cookie sessions:[/bold]", ", ".join(sessions))
        else:
            console.print("\n[dim]No saved cookies. Run: python main.py login 1688[/dim]")

    @app.command()
    def sites() -> None:
        """List supported source and target platforms."""
        table = Table(title="Supported platforms")
        table.add_column("Type")
        table.add_column("Key")
        table.add_column("Notes")
        rows = [
            ("Source", "1688", "https://www.1688.com/ — B2B wholesale"),
            ("Source", "taobao", "taobao.com / tmall.com"),
            ("Source", "aliexpress", "aliexpress.com — often easiest to scrape"),
            ("Target", "shopee", "Shopee Open Platform API"),
            ("Target", "lazada", "Lazada Open Platform API"),
            ("Target", "tiktok_shop", "TikTok Shop Partner API"),
            ("Target", "shopify", "Shopify Admin REST API"),
        ]
        for row in rows:
            table.add_row(*row)
        console.print(table)

    return app


def _print_product(product) -> None:
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


app = build_app()

