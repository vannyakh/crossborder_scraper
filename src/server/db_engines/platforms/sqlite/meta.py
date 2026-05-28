from server.db_engines.platforms._meta import PlatformMeta

META = PlatformMeta(
    platform_id="sqlite",
    product_label="Panel SQLite",
    category="database",
    supports_logical_create=False,
)
