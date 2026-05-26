import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from loguru import logger
from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from config import Settings
from core.cookies import CookieManager
from core.proxy import ProxyConfig, ProxyPool


class BrowserPool:
    """
    Shared Playwright browser with a pool of isolated contexts.

    Each worker gets its own context (proxy + cookies). Pages are created per job.
    Thread-safe for asyncio workers via asyncio.Lock on context creation.
    """

    def __init__(
        self,
        settings: Settings,
        proxy_pool: ProxyPool | None = None,
        cookie_manager: CookieManager | None = None,
        pool_size: int | None = None,
    ):
        self.settings = settings
        self.proxy_pool = proxy_pool or ProxyPool()
        self.cookies = cookie_manager or CookieManager(settings.cookies_dir)
        self.pool_size = pool_size or settings.max_concurrent_jobs
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._contexts: list[BrowserContext] = []
        self._context_lock = asyncio.Lock()
        self._started = False

    async def start(self) -> None:
        if self._started:
            return
        self._playwright = await async_playwright().start()
        launch: dict[str, Any] = {"headless": self.settings.headless}
        if self.settings.slow_mo_ms:
            launch["slow_mo"] = self.settings.slow_mo_ms
        self._browser = await self._playwright.chromium.launch(**launch)
        self._started = True
        logger.info(
            "BrowserPool started (workers={}, proxies={})",
            self.pool_size,
            self.proxy_pool.size,
        )

    async def stop(self) -> None:
        for ctx in self._contexts:
            try:
                await ctx.close()
            except Exception:
                pass
        self._contexts.clear()
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        self._started = False

    async def _build_context_options(
        self,
        proxy: ProxyConfig | None,
        worker_id: int,
    ) -> dict[str, Any]:
        opts: dict[str, Any] = {
            "locale": "zh-CN",
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": self.settings.user_agent
            or (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        }
        if proxy:
            opts["proxy"] = proxy.to_playwright()
        elif self.settings.proxy_server and self.proxy_pool.size == 0:
            single = ProxyConfig.parse_line(self.settings.proxy_server)
            if single:
                opts["proxy"] = single.to_playwright()
        return opts

    async def get_context(
        self,
        site_key: str,
        worker_id: int,
        proxy: ProxyConfig | None = None,
        session_id: str | None = None,
        save_cookies_on_close: bool = False,
    ) -> BrowserContext:
        if not self._browser:
            raise RuntimeError("BrowserPool not started")

        opts = await self._build_context_options(proxy, worker_id)
        context = await self._browser.new_context(**opts)
        await self.cookies.apply(context, site_key, session_id)

        if save_cookies_on_close:
            # Attach metadata for optional save — caller saves explicitly
            context._scraper_site_key = site_key  # type: ignore[attr-defined]
            context._scraper_session_id = session_id  # type: ignore[attr-defined]

        async with self._context_lock:
            self._contexts.append(context)
        return context

    @asynccontextmanager
    async def page_session(
        self,
        site_key: str,
        worker_id: int,
        proxy: ProxyConfig | None = None,
        session_id: str | None = None,
    ) -> AsyncIterator[tuple[Page, BrowserContext]]:
        context = await self.get_context(site_key, worker_id, proxy, session_id)
        page = await context.new_page()
        page.set_default_timeout(self.settings.browser_timeout_ms)
        try:
            yield page, context
        finally:
            try:
                await self.cookies.save(context, site_key, session_id)
            except Exception as exc:
                logger.debug("Cookie save skipped: {}", exc)
            await page.close()
            await context.close()
            async with self._context_lock:
                if context in self._contexts:
                    self._contexts.remove(context)
