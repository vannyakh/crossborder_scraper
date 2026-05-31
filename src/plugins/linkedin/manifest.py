from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import SOCIAL_CONTENT
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="social_content",
    market="social",
    data_fields=("title", "description", "images", "source_url", "source_product_id"),
    page_types=("post", "article"),
    example_urls=("https://www.linkedin.com/posts/XXXXXXXX",),
    capabilities=SOCIAL_CONTENT,
    notes="B2B social updates and company posts via OG metadata.",
)

MANIFEST = SourcePluginManifest(
    id="linkedin",
    name="LinkedIn",
    category="social",
    description="Scrape public LinkedIn posts and company updates via Open Graph metadata.",
    version="0.1.0",
    domains=("linkedin.com",),
    tags=("social", "b2b", "og"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="linkedin", scrape_spec=SCRAPE_SPEC)
