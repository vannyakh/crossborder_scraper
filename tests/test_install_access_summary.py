"""Install access summary — legacy card + plain finish, access key on public URLs."""

from __future__ import annotations

from deploy.network import build_panel_access_info
from deploy.panel_access import print_install_access_summary


def test_public_login_includes_access_key_when_entrance_enabled() -> None:
    info = build_panel_access_info(
        username="scraper_test",
        password="secret",
        bind_host="0.0.0.0",
        port=8787,
        credentials_generated=False,
        env_path="/tmp/.env",
        external_host="43.160.245.64",
        entry_path="6df1355f",
        access_key="my-key-123",
        public_http_port=80,
    )
    assert "access_key=my-key-123" in info.login_external_url
    assert info.entrance_access_url is not None
    assert "access_key=my-key-123" in info.entrance_access_url
    assert "43.160.245.64/6df1355f" in info.entrance_access_url
    assert ":8787" not in info.entrance_access_url


def test_print_install_access_summary_both_cards(capsys) -> None:
    info = build_panel_access_info(
        username="admin",
        password="pw",
        bind_host="0.0.0.0",
        port=8787,
        credentials_generated=False,
        env_path="/www/wwwroot/crossborder_scraper/.env",
        external_host="43.160.245.64",
        entry_path="abc12345",
        access_key="key99",
        public_http_port=80,
    )
    print_install_access_summary(
        info,
        install_dir="/www/wwwroot/crossborder_scraper",
        panel_port=8787,
    )
    out = capsys.readouterr().out
    assert "Installation complete" in out
    assert "access_key=key99" in out
    assert "admin" in out
    assert "43.160.245.64" in out
