from server.db_engines.platforms._meta import PlatformMeta

META = PlatformMeta(
    platform_id="redis",
    product_label="Redis",
    category="cache",
    supports_logical_create=False,
)
