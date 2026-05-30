"""Panel uninstall helper."""

from unittest.mock import patch

from deploy.uninstall import run_uninstall


def test_run_uninstall_stops_and_disables_autostart() -> None:
    auto = type("R", (), {"ok": True, "platform": "linux", "method": "systemd", "message": "ok"})()

    with (
        patch("deploy.uninstall._stop_panel", return_value="42"),
        patch("deploy.uninstall.autostart", return_value=auto),
    ):
        result = run_uninstall(purge=False, remove_systemd=False)

    assert any("Stopped panel" in s for s in result.steps)
    assert any("Auto-start disabled" in s for s in result.steps)


def test_run_uninstall_refuses_unsafe_purge() -> None:
    with patch("deploy.uninstall.repo_root", return_value=__import__("pathlib").Path.home()):
        result = run_uninstall(purge=True, stop_service=False, disable_autostart=False)

    assert result.warnings
    assert not any("Removed install" in s for s in result.steps)
