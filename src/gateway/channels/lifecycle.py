"""Start, stop, and reload integrate channel runners."""

from __future__ import annotations

from typing import Any

from gateway.channels.catalog import ALL_CHANNEL_IDS


async def start_all_channels() -> None:
    from gateway.telegram.lifecycle import start_telegram_bot

    await start_telegram_bot()


async def stop_all_channels() -> None:
    from gateway.telegram.lifecycle import stop_telegram_bot

    await stop_telegram_bot()


async def reload_all_channels() -> dict[str, Any]:
    results: dict[str, Any] = {}
    for channel_id in ALL_CHANNEL_IDS:
        results[channel_id] = await reload_channel(channel_id)
    return results


async def reload_channel(channel_id: str) -> dict[str, Any]:
    if channel_id == "telegram":
        from gateway.telegram.lifecycle import reload_telegram_bot

        await reload_telegram_bot()
        from gateway.channels import store as channel_store

        summary = channel_store.channel_summary("telegram")
        return {"ok": True, "channel_id": channel_id, "runtime_active": summary["runtime_active"]}

    if channel_id in {"discord", "slack", "email"}:
        from gateway.channels import store as channel_store

        summary = channel_store.channel_summary(channel_id)
        return {
            "ok": True,
            "channel_id": channel_id,
            "runtime_active": False,
            "message": "Credentials saved. Live runner not available for this channel yet.",
            "configured": summary["configured"],
            "enabled": summary["enabled"],
        }

    return {"ok": False, "channel_id": channel_id, "error": f"unknown channel: {channel_id}"}
