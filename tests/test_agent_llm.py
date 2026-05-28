"""Gateway agent LLM core helpers."""

from config import Settings
from core.ai.agent_llm import agent_llm_ready, merge_agent_probe


def test_agent_llm_ready_requires_enable() -> None:
    settings = Settings(ai_enabled=False, ai_api_key="sk-test")
    assert agent_llm_ready(settings) is False


def test_agent_llm_ready_with_key() -> None:
    settings = Settings(ai_enabled=True, ai_api_key="sk-test", ai_provider="openai")
    assert agent_llm_ready(settings) is True


def test_merge_agent_probe_applies_draft_fields() -> None:
    base = Settings(
        ai_provider="openai", ai_model="gpt-4o-mini", ai_base_url="https://api.openai.com/v1"
    )
    merged = merge_agent_probe(
        base,
        {"ai_provider": "anthropic", "ai_model": "claude-3-5-sonnet-20241022"},
    )
    assert merged.ai_provider == "anthropic"
    assert merged.ai_model == "claude-3-5-sonnet-20241022"
