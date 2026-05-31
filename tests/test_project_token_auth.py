"""Project API token bearer auth tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from core.paths import data_dir
from server.app import create_app


@pytest.fixture
def authed_client(tmp_path, monkeypatch):
    monkeypatch.setenv("CROSSBORDER_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("PANEL_AUTH_ENABLED", "true")
    monkeypatch.setenv("PANEL_USERNAME", "admin")
    monkeypatch.setenv("PANEL_PASSWORD", "secret-pass")
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
    auth = ("admin", "secret-pass")
    with TestClient(app) as test_client:
        yield test_client, auth


def test_project_token_grants_project_access(authed_client):
    client, auth = authed_client

    create_res = client.post("/projects", json={"name": "Token auth test"}, auth=auth)
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    denied = client.get(f"/projects/{project_id}")
    assert denied.status_code == 401

    token_res = client.post(
        f"/projects/{project_id}/settings/tokens",
        json={"label": "CI"},
        auth=auth,
    )
    assert token_res.status_code == 200
    secret = token_res.json()["secret"]

    ok = client.get(f"/projects/{project_id}", headers={"Authorization": f"Bearer {secret}"})
    assert ok.status_code == 200
    assert ok.json()["id"] == project_id

    flow_res = client.put(
        f"/projects/{project_id}/flow",
        headers={"Authorization": f"Bearer {secret}"},
        json={"nodes": create_res.json()["nodes"], "edges": create_res.json()["edges"]},
    )
    assert flow_res.status_code == 200

    settings_res = client.get(
        f"/projects/{project_id}/settings",
        headers={"Authorization": f"Bearer {secret}"},
    )
    assert settings_res.status_code == 200


def test_project_token_cannot_manage_tokens(authed_client):
    client, auth = authed_client

    create_res = client.post("/projects", json={"name": "Token scope test"}, auth=auth)
    project_id = create_res.json()["id"]
    token_res = client.post(
        f"/projects/{project_id}/settings/tokens",
        json={"label": "Deploy"},
        auth=auth,
    )
    secret = token_res.json()["secret"]

    blocked = client.post(
        f"/projects/{project_id}/settings/tokens",
        json={"label": "Escalation"},
        headers={"Authorization": f"Bearer {secret}"},
    )
    assert blocked.status_code == 401


def test_verify_project_token_helper(tmp_path, monkeypatch):
    monkeypatch.setenv("CROSSBORDER_DATA_DIR", str(tmp_path / "data"))

    from server.projects.settings_store import create_project_token, verify_project_token

    entry, secret = create_project_token("demo-project", label="Test")
    assert verify_project_token("demo-project", secret) == entry
    assert verify_project_token("demo-project", "invalid-token-value") is None
    assert verify_project_token("other-project", secret) is None
