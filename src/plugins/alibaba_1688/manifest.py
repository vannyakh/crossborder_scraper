from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import ECOMMERCE_WHOLESALE
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="ecommerce_wholesale",
    market="b2b",
    data_fields=(
        "title",
        "description",
        "price",
        "currency",
        "images",
        "variants",
        "category",
        "seller_name",
        "min_order_qty",
        "attributes",
    ),
    page_types=("product_detail", "offer_listing"),
    example_urls=("https://detail.1688.com/offer/XXXXXXXX.html",),
    currency_default="CNY",
    capabilities=ECOMMERCE_WHOLESALE,
    notes="Playwright scraper with cookie login. Primary cross-border wholesale source.",
)

MANIFEST = SourcePluginManifest(
    id="1688",
    name="1688.com",
    category="ecommerce",
    description="B2B wholesale product scraper (Playwright + cookies).",
    version="1.0.0",
    domains=("1688.com",),
    tags=("ecommerce", "builtin", "playwright"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="1688", scrape_spec=SCRAPE_SPEC)
