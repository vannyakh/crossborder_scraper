"""Gateway agent scheduler status."""

from gateway.scheduler import AgentScheduler


def test_scheduler_get_status_includes_schedules_path() -> None:
    status = AgentScheduler().get_status()
    assert "schedules_path" in status
    assert status["schedules_path"].endswith("agent_schedules.json")
    assert isinstance(status["tasks"], list)
    assert status["total"] == len(status["tasks"])
