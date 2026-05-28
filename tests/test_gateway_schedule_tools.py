"""Gateway schedule agent tools."""

from __future__ import annotations

import asyncio

import pytest

from gateway.schedules_store import load_schedules
from gateway.tools import execute_tool


@pytest.fixture(autouse=True)
def _isolate_schedules(tmp_path, monkeypatch):
    path = tmp_path / "agent_schedules.json"
    path.write_text('{"schedules": []}\n', encoding="utf-8")
    monkeypatch.setattr("gateway.schedules_store.schedules_path", lambda: path)
    yield
    if path.exists():
        path.write_text('{"schedules": []}\n', encoding="utf-8")


def test_create_and_list_schedules() -> None:
    created = asyncio.run(
        execute_tool(
            "create_schedule",
            {
                "name": "Health ping",
                "cron": "*/1 * * * *",
                "message": "Call runtime_status and summarize.",
                "notify_telegram": True,
            },
            manager=None,
        )
    )
    assert created["ok"] is True
    schedule = created["result"]["schedule"]
    assert schedule["name"] == "Health ping"
    assert schedule["notify_telegram"] is True

    listed = asyncio.run(execute_tool("list_schedules", {}, manager=None))
    assert listed["ok"] is True
    assert listed["result"]["total"] == 1


def test_update_and_delete_schedule_by_name() -> None:
    asyncio.run(
        execute_tool(
            "create_schedule",
            {
                "name": "Alert test",
                "cron": "*/5 * * * *",
                "message": "Ping runtime_status.",
            },
            manager=None,
        )
    )

    updated = asyncio.run(
        execute_tool(
            "update_schedule",
            {"name": "Alert test", "cron": "*/1 * * * *", "enabled": False},
            manager=None,
        )
    )
    assert updated["ok"] is True
    assert updated["result"]["schedule"]["cron"] == "*/1 * * * *"
    assert updated["result"]["schedule"]["enabled"] is False

    deleted = asyncio.run(execute_tool("delete_schedule", {"name": "Alert test"}, manager=None))
    assert deleted["ok"] is True
    assert load_schedules() == []


def test_agent_control_skill_includes_schedule_tools() -> None:
    from gateway.skills import get_skill_manager

    mgr = get_skill_manager()
    manifest = mgr.get_manifest("agent-control")
    assert manifest is not None
    names = set(manifest.tools)
    assert "create_schedule" in names
    assert "list_schedules" in names
    assert "configure_integrate_channel" in names
