"""Gateway agent tool outcome JSON serialization."""

from datetime import UTC, datetime

from gateway.agent_runtime import tool_outcome_for_llm, tool_outcome_for_log


def test_tool_outcome_serializes_datetime() -> None:
    outcome = {
        "ok": True,
        "tool": "runtime_status",
        "result": {
            "service": "crossborder-scraper",
            "started_at": datetime(2026, 5, 28, 6, 11, 21, tzinfo=UTC),
        },
    }
    text = tool_outcome_for_llm(outcome)
    assert "2026-05-28" in text
    logged = tool_outcome_for_log(outcome)
    assert isinstance(logged["result"]["started_at"], str)
