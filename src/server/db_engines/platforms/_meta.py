"""Shared metadata for database platform submodules."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformMeta:
    platform_id: str
    product_label: str
    category: str = "database"
    supports_logical_create: bool = False
