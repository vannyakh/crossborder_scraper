"""Tests for gateway generate_image tool and image delivery helpers."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from gateway.image_delivery import images_from_tool_calls
from gateway.tools import TOOL_DEFINITIONS, execute_tool


def test_generate_image_tool_is_registered() -> None:
    names = {item["name"] for item in TOOL_DEFINITIONS}
    assert "generate_image" in names


def test_images_from_tool_calls_collects_successful_results() -> None:
    tool_calls = [
        {
            "name": "generate_image",
            "outcome": {
                "ok": True,
                "result": {
                    "images": [
                        {
                            "path": "generated/abc.png",
                            "url": "/uploads/generated/abc.png",
                            "prompt": "red backpack",
                            "model": "dall-e-3",
                        }
                    ]
                },
            },
        }
    ]
    images = images_from_tool_calls(tool_calls)
    assert len(images) == 1
    assert images[0]["url"] == "/uploads/generated/abc.png"


def test_generate_image_tool_delegates_to_service() -> None:
    mock_result = {
        "ok": True,
        "images": [
            {
                "path": "generated/test.png",
                "url": "/uploads/generated/test.png",
                "prompt": "blue mug",
                "model": "dall-e-3",
            }
        ],
    }
    with patch("server.services.image_generation_service.get_image_generation_service") as get_svc:
        svc = get_svc.return_value
        svc.generate = AsyncMock(return_value=mock_result)
        outcome = asyncio.run(
            execute_tool(
                "generate_image",
                {"prompt": "blue mug on white background"},
                manager=None,
            )
        )
    assert outcome["ok"] is True
    assert outcome["result"]["images"][0]["url"].endswith("test.png")
    svc.generate.assert_awaited_once()
