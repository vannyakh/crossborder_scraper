from core.base_scraper import BaseScraper
from sites.alibaba_1688 import Alibaba1688Scraper
from sites.aliexpress import AliExpressScraper
from sites.taobao import TaobaoScraper

SCRAPERS: list[type[BaseScraper]] = [
    Alibaba1688Scraper,
    TaobaoScraper,
    AliExpressScraper,
]


def get_scraper_for_url(url: str) -> BaseScraper:
    for scraper_cls in SCRAPERS:
        scraper = scraper_cls()
        if scraper.matches_url(url):
            return scraper
    supported = ", ".join(s.platform.value for s in SCRAPERS)
    raise ValueError(f"URL not supported. Supported sources: {supported}")


def get_scraper_by_site(site: str) -> BaseScraper:
    mapping = {s.platform.value: s for s in SCRAPERS}
    site_key = {"1688": "1688", "taobao": "taobao", "aliexpress": "aliexpress"}.get(site.lower())
    if not site_key:
        raise ValueError(f"Unknown site: {site}")
    for scraper_cls in SCRAPERS:
        if scraper_cls.platform.value == site_key:
            return scraper_cls()
    raise ValueError(f"No scraper for site: {site}")
