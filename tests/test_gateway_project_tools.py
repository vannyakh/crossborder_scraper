"""Gateway tools for project list, templates, and template instantiation."""

from __future__ import annotations

import asyncio

from gateway.tools import TOOL_DEFINITIONS, execute_tool


def test_project_tools_registered():
    names = {row["name"] for row in TOOL_DEFINITIONS}
    for tool in (
        "list_projects",
        "list_project_templates",
        "use_project_template",
        "project_runtime_status",
        "project_settings",
    ):
        assert tool in names


def test_list_projects_tool():
    result = asyncio.run(execute_tool("list_projects", {}, manager=None))
    assert result["ok"] is True
    payload = result["result"]
    assert "projects" in payload
    assert "total" in payload


def test_list_project_templates_tool():
    result = asyncio.run(execute_tool("list_project_templates", {}, manager=None))
    assert result["ok"] is True
    payload = result["result"]
    assert payload["total"] >= 1
    assert payload["items"]


def test_use_project_template_tool():
    listed = asyncio.run(execute_tool("list_project_templates", {}, manager=None))
    template_id = listed["result"]["items"][0]["id"]
    created = asyncio.run(
        execute_tool(
            "use_project_template",
            {"template_id": template_id, "name": "Gateway template test"},
            manager=None,
        )
    )
    assert created["ok"] is True
    project = created["result"]["project"]
    assert project["name"] == "Gateway template test"
    assert project["id"]
