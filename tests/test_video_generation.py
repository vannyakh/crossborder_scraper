"""Tests for video generation client, tool, and media delivery."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import httpx

from config import Settings
from core.ai.video_client import VideoGenerationClient, video_generation_ready
from gateway.image_delivery import videos_from_tool_calls
from gateway.tools import TOOL_DEFINITIONS, execute_tool


def test_generate_video_tool_is_registered() -> None:
    names = {item["name"] for item in TOOL_DEFINITIONS}
    assert "generate_video" in names


def test_videos_from_tool_calls_collects_successful_results() -> None:
    tool_calls = [
        {
            "name": "generate_video",
            "outcome": {
                "ok": True,
                "result": {
                    "videos": [
                        {
                            "path": "generated-videos/abc.mp4",
                            "url": "/uploads/generated-videos/abc.mp4",
                            "prompt": "product demo",
                            "model": "sora-2",
                            "seconds": "8",
                            "size": "1280x720",
                            "job_id": "vid_123",
                        }
                    ]
                },
            },
        }
    ]
    videos = videos_from_tool_calls(tool_calls)
    assert len(videos) == 1
    assert videos[0]["job_id"] == "vid_123"


def test_video_generation_ready_with_openai_key() -> None:
    settings = Settings(
        ai_enabled=True,
        ai_video_enabled=True,
        ai_provider="openai",
        ai_api_key="sk-test",
        ai_video_model="sora-2",
    )
    assert video_generation_ready(settings) is True


def test_video_client_polls_and_downloads(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "core.ai.video_client.uploads_dir",
        lambda: tmp_path,
    )
    mp4 = b"\x00\x00\x00\x18ftypmp42"

    settings = Settings(
        ai_enabled=True,
        ai_video_enabled=True,
        ai_provider="openai",
        ai_api_key="sk-test",
        ai_video_model="sora-2",
        ai_video_timeout_seconds=30.0,
    )

    async def _run() -> None:
        client = VideoGenerationClient(settings)
        with patch("httpx.AsyncClient") as client_cls:
            http = AsyncMock()
            client_cls.return_value.__aenter__.return_value = http

            create_resp = httpx.Response(
                200,
                json={"id": "vid_abc", "status": "queued"},
                request=httpx.Request("POST", "http://test/videos"),
            )
            poll_resp = httpx.Response(
                200,
                json={"id": "vid_abc", "status": "completed"},
                request=httpx.Request("GET", "http://test/videos/vid_abc"),
            )
            content_resp = httpx.Response(
                200,
                content=mp4,
                request=httpx.Request("GET", "http://test/videos/vid_abc/content"),
            )
            http.post.return_value = create_resp
            http.get.side_effect = [poll_resp, content_resp]

            video = await client.generate("A product rotating on white background")
        assert video.path.is_file()
        assert video.url_path.startswith("/uploads/generated-videos/")
        assert video.job_id == "vid_abc"

    asyncio.run(_run())


def test_generate_video_tool_delegates_to_service() -> None:
    mock_result = {
        "ok": True,
        "videos": [
            {
                "path": "generated-videos/test.mp4",
                "url": "/uploads/generated-videos/test.mp4",
                "prompt": "demo",
                "model": "sora-2",
                "seconds": "8",
                "size": "1280x720",
                "job_id": "vid_test",
            }
        ],
    }
    with patch("server.services.video_generation_service.get_video_generation_service") as get_svc:
        svc = get_svc.return_value
        svc.generate = AsyncMock(return_value=mock_result)
        outcome = asyncio.run(
            execute_tool(
                "generate_video",
                {"prompt": "product demo clip", "seconds": "8"},
                manager=None,
            )
        )
    assert outcome["ok"] is True
    assert outcome["result"]["videos"][0]["url"].endswith("test.mp4")
