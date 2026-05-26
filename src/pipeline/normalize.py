from decimal import Decimal

from config import Settings
from core.models import ExportListing, ScrapedProduct


def to_export_listing(product: ScrapedProduct, settings: Settings | None = None) -> ExportListing:
    """Convert scraped product to a resale listing with markup."""
    settings = settings or Settings()
    resale = product.resale_price(settings.price_markup_percent)
    price = resale or product.price or Decimal("9.99")

    description = product.description or product.title
    if product.source_url:
        description += f"\n\nSource: {product.source_url}"

    stock = 99
    if product.variants:
        stocks = [v.stock for v in product.variants if v.stock is not None]
        if stocks:
            stock = max(stocks)

    return ExportListing(
        title=product.title[:200],
        description=description[:5000],
        price=price,
        currency=settings.default_currency,
        images=product.images[: settings.max_images_per_product],
        sku=f"{product.source.value}-{product.source_product_id}",
        stock=stock,
        source_url=product.source_url,
        source_platform=product.source,
        variants=product.variants,
    )
