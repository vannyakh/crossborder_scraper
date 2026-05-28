import asyncio
import re
from abc import ABC, abstractmethod
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from loguru import logger
from playwright.async_api import Page
from tenacity import retry, stop_after_attempt, wait_exponential

from config import Settings
from core.browser import BrowserManager
from core.models import ScrapedProduct, SourcePlatform


class BaseScraper(ABC):
    """Abstract scraper — each site implements URL matching and extraction."""

    platform: SourcePlatform
    site_key: str
    base_domains: tuple[str, ...]

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self.settings.ensure_dirs()

    def matches_url(self, url: str) -> bool:
        host = urlparse(url).netloc.lower().replace("www.", "")
        return any(domain in host for domain in self.base_domains)

    @abstractmethod
    async def scrape_product(self, url: str) -> ScrapedProduct: ...

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def fetch_page(self, page: Page, url: str) -> str:
        logger.info("[{}] Navigating to {}", self.platform.value, url)
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(self.settings.request_delay_seconds)
        # Wait for common product containers (override in subclass if needed)
        for selector in ("h1", "[class*='title']", "[class*='Title']"):
            try:
                await page.wait_for_selector(selector, timeout=15_000)
                break
            except Exception:
                continue
        return await page.content()

    async def scrape_with_browser(self, url: str) -> ScrapedProduct:
        async with BrowserManager(self.settings, self.site_key) as browser:
            page = await browser.new_page()
            html = await self.fetch_page(page, url)
            product = await self.parse_html(url, html)
            if self.settings.output_dir:
                raw_path = self._save_raw_html(url, html)
                product.raw_html_path = str(raw_path)
            return product

    @abstractmethod
    async def parse_html(self, url: str, html: str) -> ScrapedProduct: ...

    def _save_raw_html(self, url: str, html: str) -> Path:
        product_id = self.extract_product_id(url) or "unknown"
        path = self.settings.output_dir / f"{self.site_key}_{product_id}.html"
        path.write_text(html, encoding="utf-8")
        return path

    @abstractmethod
    def extract_product_id(self, url: str) -> str | None: ...

    @staticmethod
    def parse_price(text: str | None) -> Decimal | None:
        if not text:
            return None
        cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
        if not cleaned:
            return None
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return None

    @staticmethod
    def soup(html: str) -> BeautifulSoup:
        return BeautifulSoup(html, "lxml")

    @staticmethod
    def first_text(soup: BeautifulSoup, selectors: list[str]) -> str | None:
        for sel in selectors:
            el = soup.select_one(sel)
            if el and el.get_text(strip=True):
                return el.get_text(strip=True)
        return None

    @staticmethod
    def collect_images(soup: BeautifulSoup, selectors: list[str], max_count: int = 10) -> list[str]:
        urls: list[str] = []
        seen: set[str] = set()
        for sel in selectors:
            for img in soup.select(sel):
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
                if src and src not in seen:
                    if src.startswith("//"):
                        src = "https:" + src
                    urls.append(src)
                    seen.add(src)
                if len(urls) >= max_count:
                    return urls
        return urls
