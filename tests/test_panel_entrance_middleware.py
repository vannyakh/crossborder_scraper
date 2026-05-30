"""Panel entrance middleware — static asset paths under security entrance."""

from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from server.middleware.panel_entrance import PanelEntranceMiddleware


def _build_app() -> Starlette:
    async def ui_login(_request):
        return PlainTextResponse("login")

    async def ui_asset(_request):
        return PlainTextResponse("asset")

    app = Starlette(
        routes=[
            Route("/ui/login", ui_login),
            Route("/ui/assets/{path:path}", ui_asset),
        ]
    )
    app.add_middleware(
        PanelEntranceMiddleware,
        entry_path="f10585a9",
        access_key="test-access-key",
    )
    return app


def test_unprefixed_ui_assets_allowed_without_entrance_prefix() -> None:
    client = TestClient(_build_app())
    res = client.get("/ui/assets/index-CouiHTne.js")
    assert res.status_code == 200
    assert res.text == "asset"


def test_bare_ui_login_blocked_without_entrance_prefix() -> None:
    client = TestClient(_build_app())
    res = client.get("/ui/login")
    assert res.status_code == 404


def test_prefixed_ui_login_requires_access_key() -> None:
    client = TestClient(_build_app())
    blocked = client.get("/f10585a9/ui/login")
    assert blocked.status_code == 404
    ok = client.get("/f10585a9/ui/login?access_key=test-access-key")
    assert ok.status_code == 200
