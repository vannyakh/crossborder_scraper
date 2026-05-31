from core.plugins.base import SourcePluginManifest
from core.plugins.capabilities import ECOMMERCE_WHOLESALE
from core.plugins.flow_node import FlowNodeSpec
from core.plugins.spec import EcommerceScrapeSpec

SCRAPE_SPEC = EcommerceScrapeSpec(
    plugin_type="ecommerce_product",
    market="b2c",
    data_fields=(
        "title",
        "description",
        "price",
        "currency",
        "images",
        "variants",
        "seller_name",
        "attributes",
    ),
    page_types=("product_detail",),
    example_urls=("https://item.taobao.com/item.htm?id=XXXXXXXX",),
    currency_default="CNY",
    capabilities=ECOMMERCE_WHOLESALE,
    notes="Requires Taobao login cookies. Heavy JS rendering.",
)

MANIFEST = SourcePluginManifest(
    id="taobao",
    name="Taobao",
    category="ecommerce",
    description="Taobao / Tmall product scraper (login cookies recommended).",
    version="1.0.0",
    domains=("taobao.com", "tmall.com"),
    tags=("ecommerce", "builtin", "playwright"),
    scrape_spec=SCRAPE_SPEC,
)

FLOW_NODE = FlowNodeSpec.for_scrape_source(plugin_id="taobao", scrape_spec=SCRAPE_SPEC)
