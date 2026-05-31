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
    assert initial["total"] == 0

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

    runtime_res = client.get(f"/projects/{project_id}/logs?category=runtime")
    assert runtime_res.status_code == 200
    runtime_body = runtime_res.json()
    assert runtime_body["category"] == "runtime"
    assert runtime_body["total"] >= 2
    messages = [item.get("details") or "" for item in runtime_body["items"]]
    assert any("Project created" in msg for msg in messages)
    assert any("Flow canvas saved" in msg for msg in messages)
    assert all(
        item.get("meta", {}).get("project_id") == project_id for item in runtime_body["items"]
    )

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


def test_project_runtime_metrics(client: TestClient):
    create_res = client.post("/projects", json={"name": "Runtime metrics test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    runtime_res = client.get(f"/projects/{project_id}/runtime")
    assert runtime_res.status_code == 200
    body = runtime_res.json()
    assert body["project_id"] == project_id
    assert body["live"] is True
    assert "state" in body
    assert "metrics" in body
    assert len(body["metrics"]["labels"]) >= 1
    assert len(body["metrics"]["cpu"]) >= 1
    assert isinstance(body["recent_logs"], list)

    missing_res = client.get("/projects/nonexistent-project/runtime")
    assert missing_res.status_code == 404


def test_project_settings_api(client: TestClient):
    create_res = client.post("/projects", json={"name": "Settings bundle test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    get_res = client.get(f"/projects/{project_id}/settings")
    assert get_res.status_code == 200
    body = get_res.json()
    assert body["project_id"] == project_id
    assert body["general"]["visibility"] == "private"
    assert len(body["variables"]) >= 1
    assert len(body["members"]) >= 1
    assert isinstance(body["integrations"], list)
    assert body["tokens_preview"] is False

    patch_res = client.patch(
        f"/projects/{project_id}/settings",
        json={"visibility": "workspace"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["general"]["visibility"] == "workspace"

    token_res = client.post(
        f"/projects/{project_id}/settings/tokens",
        json={"label": "CI deploy"},
    )
    assert token_res.status_code == 200
    token_body = token_res.json()
    assert token_body["secret"]
    token_id = token_body["token"]["id"]

    del_res = client.delete(f"/projects/{project_id}/settings/tokens/{token_id}")
    assert del_res.status_code == 200


def test_plugin_profiles_catalog(client: TestClient):
    res = client.get("/projects/plugin-profiles/catalog")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 10
    profile_ids = {p["id"] for p in body["profiles"]}
    assert "llm-model" in profile_ids
    assert "scraper-source" in profile_ids
    for flow_id in (
        "flow-schedule",
        "flow-webhook",
        "flow-export",
        "flow-agent",
        "flow-notify",
        "flow-condition",
    ):
        assert flow_id in profile_ids

    schedule = next(p for p in body["profiles"] if p["id"] == "flow-schedule")
    cron_field = schedule["sections"][0]["fields"][0]
    assert cron_field.get("bind") == "subtitle"


def test_settings_get_does_not_persist_inferred_variables(client: TestClient):
    create_res = client.post("/projects", json={"name": "Infer read test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    from server.projects.settings_store import load_project_settings

    before = load_project_settings(project_id).get("variables")

    get_res = client.get(f"/projects/{project_id}/settings")
    assert get_res.status_code == 200
    assert get_res.json()["variables"]

    after = load_project_settings(project_id).get("variables")
    assert after == before


def test_flow_save_syncs_inferred_variables(client: TestClient):
    create_res = client.post("/projects", json={"name": "Flow infer test"})
    assert create_res.status_code == 200
    created = create_res.json()
    project_id = created["id"]
    nodes = list(created["nodes"])
    nodes.append(
        {
            "id": "node-redis-test",
            "kind": "redis",
            "role": "action",
            "label": "Redis",
            "x": 100,
            "y": 100,
            "status": "online",
        }
    )

    save_res = client.put(
        f"/projects/{project_id}/flow",
        json={"nodes": nodes, "edges": created["edges"]},
    )
    assert save_res.status_code == 200

    from server.projects.settings_store import load_project_settings

    stored = load_project_settings(project_id)
    keys = {row["key"] for row in stored.get("variables") or []}
    assert "REDIS_URL" in keys


def test_visibility_only_via_settings_patch(client: TestClient):
    create_res = client.post("/projects", json={"name": "Visibility route test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    patch_meta = client.patch(
        f"/projects/{project_id}",
        json={"name": "Renamed only"},
    )
    assert patch_meta.status_code == 200

    settings_res = client.get(f"/projects/{project_id}/settings")
    assert settings_res.json()["general"]["visibility"] == "private"

    patch_settings = client.patch(
        f"/projects/{project_id}/settings",
        json={"visibility": "workspace"},
    )
    assert patch_settings.status_code == 200
    assert patch_settings.json()["general"]["visibility"] == "workspace"


def test_project_runtime_simulated_flag(client: TestClient):
    create_res = client.post("/projects", json={"name": "Runtime simulated test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    runtime_res = client.get(f"/projects/{project_id}/runtime")
    assert runtime_res.status_code == 200
    body = runtime_res.json()
    assert body["simulated"] is True
    assert body["live"] is True


def test_catalog_routes_not_shadowed_by_project_id(client: TestClient):
    templates_res = client.get("/projects/templates")
    assert templates_res.status_code == 200
    assert templates_res.json()["total"] >= 1

    profiles_res = client.get("/projects/plugin-profiles/catalog")
    assert profiles_res.status_code == 200
    assert profiles_res.json()["total"] >= 4
    from core.paths import data_dir

    create_res = client.post("/projects", json={"name": "Derive persist test"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    raw_path = data_dir() / "projects" / f"{project_id}.json"
    raw = raw_path.read_text(encoding="utf-8")
    assert "preview_nodes" not in raw
    assert "services_online" not in raw

    get_res = client.get(f"/projects/{project_id}")
    assert get_res.status_code == 200
    assert len(get_res.json()["preview_nodes"]) >= 1


def test_delete_project(client: TestClient):
    create_res = client.post("/projects", json={"name": "Delete me"})
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]
    del_res = client.delete(f"/projects/{project_id}")
    assert del_res.status_code == 200
    assert client.get(f"/projects/{project_id}").status_code == 404
