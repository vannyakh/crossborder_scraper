from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import ECOMMERCE_RETAIL
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="ecommerce_product",
    market="crossborder",
    data_fields=(
        "title",
        "description",
        "price",
        "currency",
        "images",
        "variants",
        "category",
        "attributes",
    ),
    page_types=("product_detail",),
    example_urls=("https://www.aliexpress.com/item/XXXXXXXX.html",),
    currency_default="USD",
    capabilities=ECOMMERCE_RETAIL,
    notes="Public pages; embedded JSON extraction with browser fallback.",
)

MANIFEST = SourcePluginManifest(
    id="aliexpress",
    name="AliExpress",
    category="ecommerce",
    description="AliExpress product scraper (embedded JSON + browser fallback).",
    version="1.0.0",
    domains=("aliexpress.com", "aliexpress.us"),
    tags=("ecommerce", "builtin", "playwright"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="aliexpress", scrape_spec=SCRAPE_SPEC)
