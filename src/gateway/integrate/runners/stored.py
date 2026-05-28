"""Credentials-only channels — no live runner until a platform module ships."""

from __future__ import annotations


def is_active() -> bool:
    return False
