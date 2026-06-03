"""Tests for Telegram lifecycle polling guard."""

from __future__ import annotations

from unittest.mock import patch

from gateway.integrate.runners.telegram.lifecycle import _telegram_polling_skip_reason


def test_skip_telegram_when_dev_secondary_and_primary_busy() -> None:
    with (
        patch("deploy.network.is_port_free", return_value=False),
        patch("config.get_settings") as get_settings,
    ):
        get_settings.return_value.panel_port = 8788
        reason = _telegram_polling_skip_reason()
    assert reason is not None
    assert "8787" in reason


def test_start_telegram_when_primary_port_free() -> None:
    with (
        patch("deploy.network.is_port_free", return_value=True),
        patch("config.get_settings") as get_settings,
    ):
        get_settings.return_value.panel_port = 8788
        assert _telegram_polling_skip_reason() is None


def test_skip_when_env_flag_set(monkeypatch) -> None:
    monkeypatch.setenv("CROSSBORDER_SKIP_TELEGRAM_POLL", "1")
    assert _telegram_polling_skip_reason() is not None
