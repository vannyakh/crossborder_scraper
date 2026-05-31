from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import SOCIAL_CONTENT
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="social_content",
    market="social",
    data_fields=("title", "description", "images", "source_url", "source_product_id"),
    page_types=("post", "reel"),
    example_urls=("https://www.instagram.com/p/XXXXXXXX/",),
    currency_default="—",
    capabilities=SOCIAL_CONTENT,
    notes="Open Graph metadata from public posts. Not a product catalog scrape.",
)

MANIFEST = SourcePluginManifest(
    id="instagram",
    name="Instagram",
    category="social",
    description="Scrape public Instagram posts and reels via Open Graph metadata.",
    version="0.1.0",
    domains=("instagram.com",),
    tags=("social", "meta", "og"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="instagram", scrape_spec=SCRAPE_SPEC)
