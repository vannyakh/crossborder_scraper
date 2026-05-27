"""Re-exports for gateway.telegram (config lives in ``config.telegram_store``)."""

from config.telegram_store import (
    default_telegram,
    load_telegram_config,
    merge_telegram_updates,
    normalize_telegram,
)

__all__ = [
    "default_telegram",
    "load_telegram_config",
    "merge_telegram_updates",
    "normalize_telegram",
]
