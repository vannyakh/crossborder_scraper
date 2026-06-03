"""Collect generated images from gateway agent tool outcomes."""

from __future__ import annotations

from typing import Any


def images_from_tool_calls(tool_calls: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return unique image payloads from successful generate_image tool calls."""
    return _media_from_tool_calls(tool_calls, tool_name="generate_image", result_key="images")


def videos_from_tool_calls(tool_calls: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return unique video payloads from successful generate_video tool calls."""
    return _media_from_tool_calls(tool_calls, tool_name="generate_video", result_key="videos")


def _media_from_tool_calls(
    tool_calls: list[dict[str, Any]],
    *,
    tool_name: str,
    result_key: str,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for call in tool_calls:
        if str(call.get("name") or "") != tool_name:
            continue
        outcome = call.get("outcome") or {}
        if not outcome.get("ok"):
            continue
        result = outcome.get("result") or {}
        for item in result.get(result_key) or []:
            if not isinstance(item, dict):
                continue
            key = str(item.get("path") or item.get("url") or "")
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(item)
    return out
