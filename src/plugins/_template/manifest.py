"""Copy this package to ``src/plugins/my_shop/`` when authoring a new built-in source plugin."""

from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import ECOMMERCE_RETAIL
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="ecommerce_product",
    market="b2c",
    data_fields=("title", "description", "price", "currency", "images", "attributes"),
    page_types=("product_detail",),
    example_urls=("https://shop.example.com/products/sample",),
    currency_default="USD",
    capabilities=ECOMMERCE_RETAIL,
    notes="Replace selectors and domains before enabling in the panel.",
)

MANIFEST = SourcePluginManifest(
    id="my_shop",
    name="My shop",
    category="ecommerce",
    description="Template built-in source plugin — copy and customize this package.",
    version="0.1.0",
    domains=("shop.example.com",),
    tags=("template", "ecommerce"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="my_shop", scrape_spec=SCRAPE_SPEC)
