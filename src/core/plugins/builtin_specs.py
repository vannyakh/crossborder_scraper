"""Built-in scrape source specifications (sites + first-party plugins)."""

from __future__ import annotations

from core.plugins.spec import EcommerceScrapeSpec, ScrapeCapabilities

ECOMMERCE_WHOLESALE = ScrapeCapabilities(
    supports_login=True,
    supports_pagination=True,
    supports_variants=True,
    supports_browser=True,
    supports_ai_extraction=True,
    supports_ai_enrichment=True,
    supports_batch=True,
    max_concurrency=5,
    requires_cookies=True,
    anti_bot_level="high",
)

ECOMMERCE_RETAIL = ScrapeCapabilities(
    supports_login=False,
    supports_pagination=True,
    supports_variants=True,
    supports_browser=True,
    supports_ai_extraction=True,
    supports_ai_enrichment=True,
    supports_batch=True,
    max_concurrency=5,
    requires_cookies=False,
    anti_bot_level="medium",
)

SOCIAL_CONTENT = ScrapeCapabilities(
    supports_login=False,
    supports_pagination=False,
    supports_variants=False,
    supports_browser=True,
    supports_ai_extraction=False,
    supports_ai_enrichment=True,
    supports_batch=True,
    max_concurrency=3,
    requires_cookies=False,
    anti_bot_level="medium",
)

SITE_SPECS: dict[str, EcommerceScrapeSpec] = {
    "1688": EcommerceScrapeSpec(
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
    ),
    "taobao": EcommerceScrapeSpec(
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
    ),
    "aliexpress": EcommerceScrapeSpec(
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
    ),
}

PLUGIN_SPECS: dict[str, EcommerceScrapeSpec] = {
    "instagram": EcommerceScrapeSpec(
        plugin_type="social_content",
        market="social",
        data_fields=("title", "description", "images", "source_url", "source_product_id"),
        page_types=("post", "reel"),
        example_urls=("https://www.instagram.com/p/XXXXXXXX/",),
        currency_default="—",
        capabilities=SOCIAL_CONTENT,
        notes="Open Graph metadata from public posts. Not a product catalog scrape.",
    ),
    "tiktok": EcommerceScrapeSpec(
        plugin_type="social_content",
        market="social",
        data_fields=("title", "description", "images", "source_url", "source_product_id"),
        page_types=("video",),
        example_urls=("https://www.tiktok.com/@user/video/XXXXXXXX",),
        capabilities=SOCIAL_CONTENT,
        notes="Video page OG tags. Use for content monitoring, not SKU import.",
    ),
    "linkedin": EcommerceScrapeSpec(
        plugin_type="social_content",
        market="social",
        data_fields=("title", "description", "images", "source_url", "source_product_id"),
        page_types=("post", "article"),
        example_urls=("https://www.linkedin.com/posts/XXXXXXXX",),
        capabilities=SOCIAL_CONTENT,
        notes="B2B social updates and company posts via OG metadata.",
    ),
    "custom_plugin": EcommerceScrapeSpec(
        plugin_type="custom",
        market="custom",
        data_fields=("title", "description", "price", "images", "attributes"),
        page_types=("custom",),
        example_urls=(),
        capabilities=ScrapeCapabilities(
            supports_browser=False,
            supports_ai_extraction=True,
            supports_ai_enrichment=True,
            anti_bot_level="low",
        ),
        notes="Template for custom domains via config/plugins.yaml extra_domains.",
    ),
}
