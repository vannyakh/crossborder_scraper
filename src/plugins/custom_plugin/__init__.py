from plugins.custom_plugin.manifest import FLOW_NODE, MANIFEST, SCRAPE_SPEC
from plugins.custom_plugin.scraper import CustomPluginScraper

SCRAPER = CustomPluginScraper

__all__ = ["FLOW_NODE", "MANIFEST", "SCRAPE_SPEC", "SCRAPER", "CustomPluginScraper"]
