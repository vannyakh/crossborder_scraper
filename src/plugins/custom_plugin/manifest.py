from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import CUSTOM_TEMPLATE
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="custom",
    market="custom",
    data_fields=("title", "description", "price", "images", "attributes"),
    page_types=("custom",),
    example_urls=(),
    capabilities=CUSTOM_TEMPLATE,
    notes="Template for custom domains via config/plugins.yaml extra_domains.",
)

MANIFEST = SourcePluginManifest(
    id="custom_plugin",
    name="Custom plugin",
    category="custom",
    description="Template plugin — add domains in config/plugins.yaml (extra_domains).",
    version="0.1.0",
    domains=(),
    tags=("custom", "template", "ecommerce"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="custom_plugin", scrape_spec=SCRAPE_SPEC)
