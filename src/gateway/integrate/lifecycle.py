"""Start, stop, and reload integrate channel runners."""

from __future__ import annotations

import importlib
from typing import Any

from gateway.integrate.catalog import ALL_CHANNEL_IDS
from gateway.integrate.registry import get_channel_spec


def _lifecycle_module(channel_id: str):
    spec = get_channel_spec(channel_id)
    if not spec.lifecycle_module:
        return None
    return importlib.import_module(spec.lifecycle_module)


async def start_all_channels() -> None:
    for channel_id in ALL_CHANNEL_IDS:
        spec = get_channel_spec(channel_id)
        if spec.runner != "live" or not spec.lifecycle_module:
            continue
        lifecycle = importlib.import_module(spec.lifecycle_module)
        start = getattr(lifecycle, "start", None)
        if callable(start):
            await start()


async def stop_all_channels() -> None:
    for channel_id in ALL_CHANNEL_IDS:
        spec = get_channel_spec(channel_id)
        if spec.runner != "live" or not spec.lifecycle_module:
            continue
        lifecycle = importlib.import_module(spec.lifecycle_module)
        stop = getattr(lifecycle, "stop", None)
        if callable(stop):
            await stop()


async def reload_all_channels() -> dict[str, Any]:
    results: dict[str, Any] = {}
    for channel_id in ALL_CHANNEL_IDS:
        results[channel_id] = await reload_channel(channel_id)
    return results


async def reload_channel(channel_id: str) -> dict[str, Any]:
    from gateway.integrate import store as channel_store

    try:
        spec = get_channel_spec(channel_id)
    except LookupError:
        return {"ok": False, "channel_id": channel_id, "error": f"unknown channel: {channel_id}"}

    if spec.runner == "live" and spec.lifecycle_module:
        lifecycle = _lifecycle_module(channel_id)
        reload_fn = getattr(lifecycle, "reload", None)
        if callable(reload_fn):
            await reload_fn()
        summary = channel_store.channel_summary(channel_id)
        return {"ok": True, "channel_id": channel_id, "runtime_active": summary["runtime_active"]}

    summary = channel_store.channel_summary(channel_id)
    return {
        "ok": True,
        "channel_id": channel_id,
        "runtime_active": False,
        "message": "Credentials saved. Live runner not available for this channel yet.",
        "configured": summary["configured"],
        "enabled": summary["enabled"],
    }
