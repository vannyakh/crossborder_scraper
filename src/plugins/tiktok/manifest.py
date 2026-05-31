from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import SOCIAL_CONTENT
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="social_content",
    market="social",
    data_fields=("title", "description", "images", "source_url", "source_product_id"),
    page_types=("video",),
    example_urls=("https://www.tiktok.com/@user/video/XXXXXXXX",),
    capabilities=SOCIAL_CONTENT,
    notes="Video page OG tags. Use for content monitoring, not SKU import.",
)

MANIFEST = SourcePluginManifest(
    id="tiktok",
    name="TikTok",
    category="social",
    description="Scrape public TikTok video pages via Open Graph metadata.",
    version="0.1.0",
    domains=("tiktok.com",),
    tags=("social", "video", "og"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="tiktok", scrape_spec=SCRAPE_SPEC)
