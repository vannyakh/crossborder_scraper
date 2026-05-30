"""Project flow API tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from core.paths import data_dir
from server.app import create_app


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

    root = data_dir()
    projects_root = root / "projects"
    if projects_root.exists():
        for path in projects_root.glob("*.json"):
            path.unlink()

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_list_and_create_project(client: TestClient):
    list_res = client.get("/projects")
    assert list_res.status_code == 200
    initial = list_res.json()
    assert initial["total"] >= 3

    create_res = client.post(
        "/projects",
        json={"name": "Dev flow", "environment": "development"},
    )
    assert create_res.status_code == 200
    body = create_res.json()
    assert body["name"] == "Dev flow"
    assert len(body["nodes"]) >= 2
    assert body["edges"]

    get_res = client.get(f"/projects/{body['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == body["id"]


def test_update_flow(client: TestClient):
    create_res = client.post("/projects", json={"name": "Flow save test"})
    assert create_res.status_code == 200
    created = create_res.json()
    project_id = created["id"]
    nodes = created["nodes"]
    edges = created["edges"]
    nodes[0]["label"] = "Updated trigger"

    put_res = client.put(
        f"/projects/{project_id}/flow",
        json={"nodes": nodes, "edges": edges},
    )
    assert put_res.status_code == 200
    assert put_res.json()["nodes"][0]["label"] == "Updated trigger"


def test_update_flow_persists_node_positions(client: TestClient):
    create_res = client.post("/projects", json={"name": "Layout save test"})
    assert create_res.status_code == 200
    created = create_res.json()
    project_id = created["id"]
    nodes = created["nodes"]
    edges = created["edges"]
    nodes[0]["x"] = 42
    nodes[0]["y"] = 84

    put_res = client.put(
        f"/projects/{project_id}/flow",
        json={"nodes": nodes, "edges": edges},
    )
    assert put_res.status_code == 200
    saved = put_res.json()
    assert saved["nodes"][0]["x"] == 42
    assert saved["nodes"][0]["y"] == 84

    get_res = client.get(f"/projects/{project_id}")
    assert get_res.status_code == 200
    loaded = get_res.json()
    assert loaded["nodes"][0]["x"] == 42
    assert loaded["nodes"][0]["y"] == 84


def test_project_presence_empty(client: TestClient):
    res = client.get("/projects/presence")
    assert res.status_code == 200
    assert res.json() == {"items": []}


def test_project_logs_scoped(client: TestClient):
    create_res = client.post("/projects", json={"name": "Logs scope test"})
    assert create_res.status_code == 200
    created = create_res.json()
    project_id = created["id"]

    save_res = client.put(
        f"/projects/{project_id}/flow",
        json={"nodes": created["nodes"], "edges": created["edges"]},
    )
    assert save_res.status_code == 200

    logs_res = client.get(f"/projects/{project_id}/logs?category=operation")
    assert logs_res.status_code == 200
    body = logs_res.json()
    assert body["category"] == "operation"
    assert body["total"] >= 1
    assert any(project_id in (item.get("details") or "") for item in body["items"])

    missing_res = client.get("/projects/nonexistent-project/logs")
    assert missing_res.status_code == 404


def test_update_project_settings(client: TestClient):
    create_res = client.post("/projects", json={"name": "Settings test", "environment": "staging"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/projects/{project_id}",
        json={"name": "Renamed", "description": "Updated desc", "environment": "production"},
    )
    assert patch_res.status_code == 200
    body = patch_res.json()
    assert body["name"] == "Renamed"
    assert body["description"] == "Updated desc"
    assert body["environment"] == "production"


def test_plugin_profiles_catalog(client: TestClient):
    res = client.get("/projects/plugin-profiles/catalog")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 4
    profile_ids = {p["id"] for p in body["profiles"]}
    assert "llm-model" in profile_ids
    assert "scraper-source" in profile_ids


def test_delete_project(client: TestClient):
    create_res = client.post("/projects", json={"name": "Delete me"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]
    del_res = client.delete(f"/projects/{project_id}")
    assert del_res.status_code == 200
    assert client.get(f"/projects/{project_id}").status_code == 404
