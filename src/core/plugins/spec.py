"""E-commerce scrape plugin specification model (shown in panel catalog/API)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

PluginType = Literal[
    "ecommerce_product",
    "ecommerce_wholesale",
    "social_content",
    "marketplace_export",
    "custom",
]
MarketType = Literal["b2b", "b2c", "social", "crossborder", "custom"]
ScrapeCategory = Literal["ecommerce", "social", "custom"]

# Normalized ScrapedProduct fields the platform understands
STANDARD_DATA_FIELDS: tuple[str, ...] = (
    "title",
    "description",
    "price",
    "currency",
    "images",
    "variants",
    "sku",
    "category",
    "seller_name",
    "seller_id",
    "min_order_qty",
    "attributes",
    "source_url",
    "source_product_id",
)


@dataclass(frozen=True)
class ScrapeCapabilities:
    supports_login: bool = False
    supports_pagination: bool = False
    supports_variants: bool = False
    supports_browser: bool = True
    supports_ai_extraction: bool = True
    supports_ai_enrichment: bool = True
    supports_batch: bool = True
    max_concurrency: int = 5
    requires_cookies: bool = False
    anti_bot_level: Literal["low", "medium", "high"] = "medium"

    def to_dict(self) -> dict[str, Any]:
        return {
            "supports_login": self.supports_login,
            "supports_pagination": self.supports_pagination,
            "supports_variants": self.supports_variants,
            "supports_browser": self.supports_browser,
            "supports_ai_extraction": self.supports_ai_extraction,
            "supports_ai_enrichment": self.supports_ai_enrichment,
            "supports_batch": self.supports_batch,
            "max_concurrency": self.max_concurrency,
            "requires_cookies": self.requires_cookies,
            "anti_bot_level": self.anti_bot_level,
        }


@dataclass(frozen=True)
class EcommerceScrapeSpec:
    """Public specification for scrape/source plugins in the App Store."""

    plugin_type: PluginType
    market: MarketType
    data_fields: tuple[str, ...]
    page_types: tuple[str, ...] = ()
    example_urls: tuple[str, ...] = ()
    output_model: str = "ScrapedProduct"
    currency_default: str = "CNY"
    capabilities: ScrapeCapabilities = field(default_factory=ScrapeCapabilities)
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "plugin_type": self.plugin_type,
            "market": self.market,
            "data_fields": list(self.data_fields),
            "page_types": list(self.page_types),
            "example_urls": list(self.example_urls),
            "output_model": self.output_model,
            "currency_default": self.currency_default,
            "capabilities": self.capabilities.to_dict(),
            "notes": self.notes,
            "standard_fields_available": list(STANDARD_DATA_FIELDS),
        }


def parse_scrape_spec(raw: dict[str, Any] | None) -> EcommerceScrapeSpec | None:
    if not raw or not isinstance(raw, dict):
        return None
    caps_raw = raw.get("capabilities") or {}
    caps = ScrapeCapabilities(
        supports_login=bool(caps_raw.get("supports_login")),
        supports_pagination=bool(caps_raw.get("supports_pagination")),
        supports_variants=bool(caps_raw.get("supports_variants")),
        supports_browser=bool(caps_raw.get("supports_browser", True)),
        supports_ai_extraction=bool(caps_raw.get("supports_ai_extraction", True)),
        supports_ai_enrichment=bool(caps_raw.get("supports_ai_enrichment", True)),
        supports_batch=bool(caps_raw.get("supports_batch", True)),
        max_concurrency=int(caps_raw.get("max_concurrency", 5)),
        requires_cookies=bool(caps_raw.get("requires_cookies")),
        anti_bot_level=caps_raw.get("anti_bot_level", "medium"),  # type: ignore[arg-type]
    )
    fields = raw.get("data_fields") or []
    if not isinstance(fields, list):
        fields = []
    return EcommerceScrapeSpec(
        plugin_type=raw.get("plugin_type", "custom"),  # type: ignore[arg-type]
        market=raw.get("market", "custom"),  # type: ignore[arg-type]
        data_fields=tuple(str(f) for f in fields),
        page_types=tuple(str(p) for p in (raw.get("page_types") or [])),
        example_urls=tuple(str(u) for u in (raw.get("example_urls") or [])),
        output_model=str(raw.get("output_model") or "ScrapedProduct"),
        currency_default=str(raw.get("currency_default") or "CNY"),
        capabilities=caps,
        notes=str(raw.get("notes") or ""),
    )
