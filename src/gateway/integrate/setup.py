"""Programmatic integrate channel setup — import from scripts, CLI, and agent tools."""

from __future__ import annotations

from typing import Any

from gateway.integrate import store as channel_store
from gateway.integrate.catalog import ALL_CHANNEL_IDS
from gateway.integrate.lifecycle import reload_channel as _reload_channel


def list_channels() -> list[dict[str, Any]]:
    """Return status summary for every integrate channel."""
    return channel_store.list_channel_summaries()


def get_channel(channel_id: str) -> dict[str, Any]:
    """Return catalog metadata, setup steps, and current config (secrets masked)."""
    if channel_id not in ALL_CHANNEL_IDS:
        raise LookupError(f"unknown channel: {channel_id}")
    return channel_store.channel_detail(channel_id)


def configure_channel(channel_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Merge credential and option updates for a channel."""
    if channel_id not in ALL_CHANNEL_IDS:
        raise LookupError(f"unknown channel: {channel_id}")
    channel_store.save_channel_updates(channel_id, updates)
    return channel_store.channel_detail(channel_id)


def enable_channel(channel_id: str, *, enabled: bool = True) -> dict[str, Any]:
    """Toggle channel enabled flag."""
    return configure_channel(channel_id, {"enabled": enabled})


def channel_status(channel_id: str | None = None) -> dict[str, Any]:
    """Return one channel or all channel status rows."""
    if channel_id:
        return channel_store.channel_summary(channel_id)
    items = list_channels()
    return {"items": items, "total": len(items)}


async def reload_channel(channel_id: str) -> dict[str, Any]:
    """Restart the live runner for a channel."""
    return await _reload_channel(channel_id)
