"""Module profiles — operator guides and panel metadata from libs/module_profiles/*.md."""

from server.module_profiles.enrich import enrich_catalog_row, profile_for_row
from server.module_profiles.loader import (
    ModuleProfile,
    discover_module_profiles,
    get_module_profile,
    reload_module_profiles,
)

__all__ = [
    "ModuleProfile",
    "discover_module_profiles",
    "enrich_catalog_row",
    "get_module_profile",
    "profile_for_row",
    "reload_module_profiles",
]
