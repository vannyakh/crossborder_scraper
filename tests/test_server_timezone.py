"""Server timezone config and cron scheduling."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest

from config.server_store import load_server_config, save_server_timezone
from core.timezone import validate_timezone
from gateway.schedules_store import compute_next_run, recalculate_schedule_next_runs


def test_validate_timezone_accepts_iana_name() -> None:
    assert validate_timezone("Asia/Phnom_Penh") == "Asia/Phnom_Penh"


def test_validate_timezone_rejects_invalid() -> None:
    with pytest.raises(ValueError, match="Invalid timezone"):
        validate_timezone("Not/A_Real_Zone")


def test_compute_next_run_uses_panel_timezone(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    ui_path = tmp_path / "ui_config.json"
    ui_path.write_text(
        json.dumps({"server": {"timezone": "Asia/Phnom_Penh"}}),
        encoding="utf-8",
    )
    monkeypatch.setattr("config.ui_store.UI_CONFIG_PATH", ui_path)
    monkeypatch.setattr("config.ui_store.UI_CONFIG_DIR", tmp_path)

    base = datetime(2026, 5, 28, 1, 0, 0, tzinfo=ZoneInfo("UTC"))
    utc_next = compute_next_run("0 9 * * *", base)
    assert utc_next.endswith("Z")

    monkeypatch.setattr(
        "config.server_store.load_server_config",
        lambda: {"timezone": "UTC"},
    )
    utc_only_next = compute_next_run("0 9 * * *", base)
    assert utc_next != utc_only_next


def test_save_server_timezone_persists(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    ui_path = tmp_path / "ui_config.json"
    ui_path.write_text("{}", encoding="utf-8")
    monkeypatch.setattr("config.ui_store.UI_CONFIG_PATH", ui_path)
    monkeypatch.setattr("config.ui_store.UI_CONFIG_DIR", tmp_path)

    saved = save_server_timezone("Asia/Singapore")
    assert saved == "Asia/Singapore"
    assert load_server_config()["timezone"] == "Asia/Singapore"


def test_panel_security_status_includes_timezone() -> None:
    from server.services.panel_security import build_panel_security_status

    status = build_panel_security_status()
    assert status["server_timezone"]["timezone"]
    assert status["timezone_options"]


def test_recalculate_schedule_next_runs(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    sched_path = tmp_path / "agent_schedules.json"
    sched_path.write_text(
        json.dumps(
            {
                "schedules": [
                    {
                        "id": "s1",
                        "name": "daily",
                        "cron": "0 9 * * *",
                        "enabled": True,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("gateway.schedules_store.schedules_path", lambda: sched_path)

    with patch("config.server_store.load_server_config", return_value={"timezone": "UTC"}):
        first = compute_next_run("0 9 * * *")
    with patch("config.server_store.load_server_config", return_value={"timezone": "Asia/Tokyo"}):
        recalculate_schedule_next_runs()
        data = json.loads(sched_path.read_text(encoding="utf-8"))
        second = data["schedules"][0]["next_run_at"]

    assert first != second
