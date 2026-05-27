from sites.registry import get_scraper_by_site, get_scraper_for_url


def __getattr__(name: str):
    if name == "SCRAPERS":
        from sites.registry import _all_scraper_classes

        return _all_scraper_classes()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["SCRAPERS", "get_scraper_by_site", "get_scraper_for_url"]
