"""Login CAPTCHA after failed sign-in."""

from fastapi import FastAPI
from starlette.testclient import TestClient

from server.routers.auth import router as auth_router
from server.services import login_captcha as captcha_svc
from server.services.login_captcha import verify_captcha_answer


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(auth_router)
    return TestClient(app)


def _settings():
    return type(
        "S",
        (),
        {
            "panel_auth_enabled": True,
            "panel_username": "admin",
            "panel_password": "secret",
        },
    )()


def test_captcha_not_required_until_failed_login(monkeypatch) -> None:
    monkeypatch.setattr("server.routers.auth.verify_panel_credentials", lambda _u, _p: False)
    monkeypatch.setattr("server.routers.auth.get_settings", _settings)
    client = _client()
    captcha_svc.clear_login_failures("testclient")
    assert client.get("/auth/status").json()["captcha_required"] is False
    client.post("/auth/login", json={"username": "admin", "password": "wrong"})
    assert client.get("/auth/status").json()["captcha_required"] is True


def test_login_requires_captcha_after_failure(monkeypatch) -> None:
    monkeypatch.setattr(
        "server.routers.auth.verify_panel_credentials",
        lambda u, p: u == "admin" and p == "secret",
    )
    monkeypatch.setattr("server.routers.auth.get_settings", _settings)
    client = _client()
    captcha_svc.clear_login_failures("testclient")
    client.post("/auth/login", json={"username": "admin", "password": "bad"})

    blocked = client.post(
        "/auth/login",
        json={"username": "admin", "password": "secret"},
    )
    assert blocked.status_code == 400
    assert blocked.json()["detail"]["captcha_required"] is True

    cap = client.get("/auth/captcha")
    assert cap.status_code == 200
    body = cap.json()
    assert body["kind"] in ("image", "audio")
    assert body["media_base64"]

    bad_cap = client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "secret",
            "captcha_id": body["captcha_id"],
            "captcha_answer": "ZZZZZ",
        },
    )
    assert bad_cap.status_code == 400

    cap2 = client.get("/auth/captcha")
    monkeypatch.setattr("server.routers.auth.verify_captcha_answer", lambda _i, _a: True)
    ok = client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "secret",
            "captcha_id": cap2.json()["captcha_id"],
            "captcha_answer": "ABCDE",
        },
    )
    assert ok.status_code == 200
    assert client.get("/auth/status").json()["captcha_required"] is False


def test_verify_captcha_rejects_non_ascii() -> None:
    payload = captcha_svc.create_captcha_challenge()
    assert not verify_captcha_answer(payload.captcha_id, "\u2026")
