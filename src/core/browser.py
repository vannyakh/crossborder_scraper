from pathlib import Path
from typing import Any

from loguru import logger
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from config import Settings
from core.cookies import CookieManager
from core.proxy import ProxyConfig, proxy_pool_for_settings


class BrowserManager:
    """Single-session Playwright browser (login, one-off scrapes)."""

    def __init__(
        self,
        settings: Settings,
        site_key: str,
        *,
        proxy: ProxyConfig | None = None,
        session_id: str | None = None,
    ):
        self.settings = settings
        self.site_key = site_key
        self.proxy = proxy
        self.session_id = session_id
        self.cookies = CookieManager(settings.cookies_dir)
        self._playwright: Any = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    @property
    def cookie_file(self) -> Path:
        return self.cookies.path_for(self.site_key, self.session_id)

    async def __aenter__(self) -> "BrowserManager":
        self._playwright = await async_playwright().start()
        launch_args: dict[str, Any] = {"headless": self.settings.headless}
        if self.settings.slow_mo_ms:
            launch_args["slow_mo"] = self.settings.slow_mo_ms

        self._browser = await self._playwright.chromium.launch(**launch_args)
        context_opts: dict[str, Any] = {
            "locale": "zh-CN",
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": self.settings.user_agent
            or (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        }
        proxy = self.proxy
        if not proxy:
            pool = proxy_pool_for_settings(self.settings)
            if pool.size:
                proxy = pool.get(0)
        if proxy:
            context_opts["proxy"] = proxy.to_playwright()

        self._context = await self._browser.new_context(**context_opts)
        await self.cookies.apply(self._context, self.site_key, self.session_id)
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._context:
            await self._save_cookies()
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def _load_cookies(self) -> None:
        if self._context:
            await self.cookies.apply(self._context, self.site_key, self.session_id)

    async def _save_cookies(self) -> None:
        if self._context:
            await self.cookies.save(self._context, self.site_key, self.session_id)
            logger.debug("Saved cookies for {}", self.site_key)

    async def new_page(self) -> Page:
        if not self._context:
            raise RuntimeError("BrowserManager not started")
        page = await self._context.new_page()
        page.set_default_timeout(self.settings.browser_timeout_ms)
        return page

    @property
    def context(self) -> BrowserContext:
        if not self._context:
            raise RuntimeError("BrowserManager not started")
        return self._context
