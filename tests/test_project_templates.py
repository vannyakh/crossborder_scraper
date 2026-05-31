"""Community project flow templates API."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from server.projects.community.clone import clone_flow_graph
from server.projects.community.loader import discover_project_templates, reload_project_templates


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CROSSBORDER_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("PANEL_AUTH_ENABLED", "false")
    monkeypatch.setenv("PANEL_ENTRY_PATH", "")
    monkeypatch.setenv("PANEL_SECURITY_ENTRANCE", "false")

    async def _noop_channels() -> None:
        return None

    monkeypatch.setattr("gateway.integrate.lifecycle.start_all_channels", _noop_channels)
    monkeypatch.setattr("gateway.integrate.lifecycle.stop_all_channels", _noop_channels)

    from core.paths import data_dir
    from server.app import create_app

    projects_root = data_dir() / "projects"
    if projects_root.exists():
        for path in projects_root.glob("*.json"):
            path.unlink()

    reload_project_templates()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_discover_project_templates_includes_builtins() -> None:
    reload_project_templates()
    templates = discover_project_templates()
    assert len(templates) >= 4
    assert "scrape-to-export" in templates
    assert "gateway-agent-starter" in templates


def test_clone_flow_graph_remaps_ids() -> None:
    nodes = [
        {"id": "tpl-a", "kind": "schedule", "label": "A", "x": 1, "y": 2},
        {"id": "tpl-b", "kind": "agent", "label": "B", "x": 3, "y": 4},
    ]
    edges = [{"id": "tpl-e", "from": "tpl-a", "to": "tpl-b", "kind": "main"}]
    cloned_nodes, cloned_edges = clone_flow_graph(nodes, edges)
    assert cloned_nodes[0]["id"] != "tpl-a"
    assert cloned_nodes[1]["id"] != "tpl-b"
    assert cloned_edges[0]["from"] == cloned_nodes[0]["id"]
    assert cloned_edges[0]["to"] == cloned_nodes[1]["id"]


def test_list_project_templates(client: TestClient) -> None:
    res = client.get("/projects/templates")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 4
    ids = {item["id"] for item in body["items"]}
    assert "scrape-to-export" in ids
    assert body["categories"]


def test_get_project_template_detail(client: TestClient) -> None:
    res = client.get("/projects/templates/scrape-to-export")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "scrape-to-export"
    assert len(body["nodes"]) >= 3
    assert len(body["edges"]) >= 2
    assert body["preview_nodes"]


def test_use_project_template_creates_project(client: TestClient) -> None:
    use_res = client.post(
        "/projects/templates/gateway-agent-starter/use",
        json={"name": "From template", "environment": "development"},
    )
    assert use_res.status_code == 200
    body = use_res.json()
    assert body["template_id"] == "gateway-agent-starter"
    assert body["project"]["name"] == "From template"
    assert len(body["project"]["nodes"]) >= 2

    project_id = body["project"]["id"]
    get_res = client.get(f"/projects/{project_id}")
    assert get_res.status_code == 200
    loaded = get_res.json()
    assert loaded["name"] == "From template"
    node_ids = {node["id"] for node in loaded["nodes"]}
    assert "tpl-schedule-1" not in node_ids


def test_use_unknown_template_404(client: TestClient) -> None:
    res = client.post("/projects/templates/missing-template/use", json={"name": "X"})
    assert res.status_code == 404
