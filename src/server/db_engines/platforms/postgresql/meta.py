from server.db_engines.platforms._meta import PlatformMeta

META = PlatformMeta(
    platform_id="postgresql",
    product_label="PostgreSQL",
    category="database",
    supports_logical_create=True,
)
