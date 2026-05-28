"""Integrate channel store and setup helpers."""

from __future__ import annotations

from pathlib import Path

from config.integrate_channels_store import merge_channel_updates
from gateway.integrate.setup import configure_channel, list_channels


def test_list_channels_includes_all_ids() -> None:
    ids = {row["id"] for row in list_channels()}
    assert ids == {"telegram", "discord", "slack", "email"}


def test_merge_discord_credentials() -> None:
    merged = merge_channel_updates(
        "discord",
        {},
        {"bot_token": "secret", "application_id": "123", "enabled": True},
    )
    assert merged["bot_token"] == "secret"
    assert merged["application_id"] == "123"
    assert merged["enabled"] is True


def test_configure_stored_channel_persists(tmp_path: Path, monkeypatch) -> None:
    config_path = tmp_path / "ui_config.json"
    config_path.write_text("{}", encoding="utf-8")
    monkeypatch.setattr("config.ui_store.UI_CONFIG_PATH", config_path)
    monkeypatch.setattr("config.ui_store.UI_CONFIG_DIR", tmp_path)

    detail = configure_channel(
        "slack",
        {"bot_token": "xoxb-test", "signing_secret": "sec", "enabled": True},
    )
    assert detail["configured"] is True
    assert detail["enabled"] is True
    assert detail["config"]["bot_token_set"] is True
