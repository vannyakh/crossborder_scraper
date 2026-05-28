"""Agent LLM setup API tests."""

import asyncio

from server.services.agent_llm_service import get_agent_llm_service


def test_agent_llm_setup_returns_steps() -> None:
    result = asyncio.run(get_agent_llm_service().get_setup())
    assert "steps" in result
    assert len(result["steps"]) >= 5
    assert "gateway" in result
    assert "chat_ready" in result
