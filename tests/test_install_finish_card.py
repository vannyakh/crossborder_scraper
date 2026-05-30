"""Install finish access card."""

from __future__ import annotations

from deploy.network import build_panel_access_info
from deploy.panel_access import print_install_finish_card


def test_print_install_finish_card_security_entrance(capsys) -> None:
    info = build_panel_access_info(
        username="scraper_test",
        password="secret-pass",
        bind_host="0.0.0.0",
        port=8787,
        credentials_generated=True,
        env_path="/tmp/.env",
        external_host="203.0.113.10",
        entry_path="a1b2c3d4",
        access_key="my-access-key",
        public_http_port=80,
    )
    print_install_finish_card(info, install_dir="/opt/crossborder")
    out = capsys.readouterr().out
    assert "Panel URL:" in out
    assert "access_key=my-access-key" in out
    assert "Login URL:" in out
    assert "scraper_test" in out
    assert "secret-pass" in out
    assert "Access key:" in out
    assert "Save this card" in out


def test_print_install_finish_card_plain_login(capsys) -> None:
    info = build_panel_access_info(
        username="admin",
        password="pw",
        bind_host="0.0.0.0",
        port=8787,
        credentials_generated=True,
        env_path="/tmp/.env",
        external_host="203.0.113.10",
    )
    print_install_finish_card(info)
    out = capsys.readouterr().out
    assert "Login URL:" in out
    assert "admin" in out
    assert "access_key=" not in out
