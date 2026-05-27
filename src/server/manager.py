"""Backward-compatible re-exports — prefer ``server.services.facade``."""

from server.services.facade import ScrapeManager, get_manager

__all__ = ["ScrapeManager", "get_manager"]
