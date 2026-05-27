from core.base_scraper import BaseScraper
from core.plugins import enabled_scraper_classes, get_scraper_for_url as get_plugin_scraper
from sites.alibaba_1688 import Alibaba1688Scraper
from sites.aliexpress import AliExpressScraper
from sites.taobao import TaobaoScraper

_BUILTIN_SCRAPERS: list[type[BaseScraper]] = [
    Alibaba1688Scraper,
    TaobaoScraper,
    AliExpressScraper,
]


def _all_scraper_classes() -> list[type[BaseScraper]]:
    return [*_BUILTIN_SCRAPERS, *enabled_scraper_classes()]


def get_scraper_for_url(url: str) -> BaseScraper:
    for scraper_cls in _BUILTIN_SCRAPERS:
        scraper = scraper_cls()
        if scraper.matches_url(url):
            return scraper

    plugin_scraper = get_plugin_scraper(url)
    if plugin_scraper:
        return plugin_scraper

    labels = ", ".join(sorted({cls.platform.value for cls in _all_scraper_classes()}))
    raise ValueError(f"URL not supported. Supported sources: {labels}")


def get_scraper_by_site(site: str) -> BaseScraper:
    site_key = site.lower()
    legacy = {"1688": "1688", "taobao": "taobao", "aliexpress": "aliexpress"}
    if site_key in legacy:
        for scraper_cls in _BUILTIN_SCRAPERS:
            if scraper_cls.platform.value == legacy[site_key]:
                return scraper_cls()
    for scraper_cls in enabled_scraper_classes():
        if scraper_cls.platform.value == site_key:
            return scraper_cls()
    raise ValueError(f"No scraper for site: {site}")
