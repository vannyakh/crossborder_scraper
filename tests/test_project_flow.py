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


def test_delete_project(client: TestClient):
    create_res = client.post("/projects", json={"name": "Delete me"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]
    del_res = client.delete(f"/projects/{project_id}")
    assert del_res.status_code == 200
    assert client.get(f"/projects/{project_id}").status_code == 404
