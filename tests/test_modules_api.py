"""Module profiles HTTP API."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

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

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_modules_meta(client: TestClient):
    res = client.get("/modules/meta")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 5
    ids = {row["id"] for row in body["modules"]}
    assert "ollama" in ids
    assert "scrape-assistant" in ids
    assert any(row["id"] == "ai" or row["label"] for row in body["categories"])


def test_module_profile_detail(client: TestClient):
    res = client.get("/modules/ollama")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "ollama"
    assert body["has_guide"] is True
    assert "Ollama" in body["body_md"]


def test_store_catalog_enriched(client: TestClient):
    res = client.get("/store/catalog")
    assert res.status_code == 200
    ollama = next(item for item in res.json()["items"] if item["id"] == "ollama")
    assert ollama["has_guide"] is True
    assert ollama["icon"] == "brain"


def test_gateway_skills_enriched(client: TestClient):
    res = client.get("/gateway/skills")
    assert res.status_code == 200
    skill = next(item for item in res.json()["items"] if item["id"] == "scrape-assistant")
    assert skill["has_guide"] is True
