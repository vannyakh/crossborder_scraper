from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

SourceSite = Literal["1688", "taobao", "aliexpress"]
TargetMarketplace = Literal["shopee", "lazada", "tiktok_shop", "shopify"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Panel UI access (HTTP Basic — auto-generated on `scraper setup`)
    panel_auth_enabled: bool = True
    panel_username: str | None = None
    panel_password: str | None = None
    panel_host: str = "0.0.0.0"
    panel_port: int = 8787
    panel_external_host: str | None = None
    # Security entrance: secret path (e.g. /a1b2c3d4/) + access key before login
    panel_entry_path: str | None = None
    panel_access_key: str | None = None
    panel_security_entrance: bool = False
    # Public HTTP port for access-card URLs when nginx fronts the panel (usually 80)
    panel_public_http_port: int | None = None

    # Paths
    data_dir: Path = Field(default=Path("data"))
    cookies_dir: Path = Field(default=Path("data/cookies"))
    output_dir: Path = Field(default=Path("data/output"))
    db_path: Path = Field(default=Path("data/products.db"))

    # Browser
    headless: bool = True
    browser_timeout_ms: int = 60_000
    slow_mo_ms: int = 0
    user_agent: str | None = None
    proxy_server: str | None = None
    proxy_list_path: Path | None = Field(default=Path("config/proxies.txt"))
    proxy_rotation_strategy: Literal["round_robin", "random"] = "round_robin"
    vpn_enabled: bool = False
    vpn_mode: Literal["local_socks", "wireguard"] = "local_socks"
    vpn_local_endpoint: str | None = None
    vpn_config_path: Path | None = None

    # Scrape engine concurrency
    max_concurrent_jobs: int = 3
    engine_queue_size: int = 100

    # Scrape limits
    max_images_per_product: int = 10
    request_delay_seconds: float = 2.0

    # AI — provider: openai | anthropic | google | ollama | qwen | custom
    ai_provider: str = "openai"
    ai_enabled: bool = False
    ai_fallback: bool = True  # use AI when CSS parse looks incomplete
    ai_api_key: str | None = None
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"
    ai_max_html_chars: int = 24_000
    ai_timeout_seconds: float = 90.0
    ai_agent_enabled: bool = False  # validate + enrich listing copy after extraction
    ai_image_enabled: bool = True  # gateway agent + bot image generation
    ai_image_model: str = "dall-e-3"
    ai_video_enabled: bool = True  # gateway agent + bot video generation (Sora)
    ai_video_model: str = "sora-2"
    ai_video_timeout_seconds: float = 300.0

    # UI preference (overridden by config/ui_config.json when set)
    scrape_default_workers: int | None = None

    # Project canvas collaboration — optional Redis pub/sub for multi-instance sync
    project_collab_redis_url: str | None = Field(
        default=None,
        validation_alias="CROSSBORDER_PROJECT_COLLAB_REDIS_URL",
    )

    # Pricing (resell margin)
    price_markup_percent: float = 35.0
    default_currency: str = "USD"

    # Shopee Open API
    shopee_partner_id: str | None = None
    shopee_partner_key: str | None = None
    shopee_shop_id: str | None = None
    shopee_access_token: str | None = None

    # Lazada Open Platform
    lazada_app_key: str | None = None
    lazada_app_secret: str | None = None
    lazada_access_token: str | None = None

    # TikTok Shop API
    tiktok_app_key: str | None = None
    tiktok_app_secret: str | None = None
    tiktok_access_token: str | None = None
    tiktok_shop_cipher: str | None = None

    # Shopify Admin API
    shopify_shop_domain: str | None = None
    shopify_access_token: str | None = None
    shopify_api_version: str = "2025-01"

    def ensure_dirs(self) -> None:
        from core.paths import installed_plugins_dir, installed_skills_dir, uploads_dir

        for path in (
            self.data_dir,
            self.cookies_dir,
            self.output_dir,
            self.db_path.parent,
            uploads_dir(),
            installed_plugins_dir(),
            installed_skills_dir(),
        ):
            path.mkdir(parents=True, exist_ok=True)


def get_settings() -> Settings:
    from config.ui_store import apply_ui_config, ensure_ui_config_file
    from core.paths import ensure_runtime_layout, resolve_settings_paths

    ensure_ui_config_file()
    ensure_runtime_layout()
    settings = Settings()
    settings = apply_ui_config(settings)
    settings = resolve_settings_paths(settings)
    settings.ensure_dirs()
    return settings
