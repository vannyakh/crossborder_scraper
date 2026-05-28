from server.db_engines.platforms._meta import PlatformMeta

META = PlatformMeta(
    platform_id="mongodb",
    product_label="MongoDB",
    category="database",
    supports_logical_create=True,
)
