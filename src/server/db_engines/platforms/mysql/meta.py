from server.db_engines.platforms._meta import PlatformMeta

META = PlatformMeta(
    platform_id="mysql",
    product_label="MySQL",
    category="database",
    supports_logical_create=True,
)
