"""Shared scrape capability presets for built-in source plugins."""

from __future__ import annotations

from core.plugins.spec import ScrapeCapabilities

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

CUSTOM_TEMPLATE = ScrapeCapabilities(
    supports_browser=False,
    supports_ai_extraction=True,
    supports_ai_enrichment=True,
    anti_bot_level="low",
)
