"""Anthropic tool schema normalization for gateway agent."""

from core.ai.llm_client import (
    LLMClient,
    anthropic_supports_sampling,
    build_anthropic_messages_payload,
    normalize_anthropic_input_schema,
)
from gateway.tools import TOOL_DEFINITIONS, tools_for_llm


def test_normalize_empty_object_schema() -> None:
    schema = normalize_anthropic_input_schema({"type": "object", "properties": {}})
    assert schema["additionalProperties"] is False


def test_normalize_free_form_object_schema() -> None:
    schema = normalize_anthropic_input_schema(
        {"type": "object", "description": "merge fields", "properties": {}}
    )
    assert schema["additionalProperties"] is True


def test_anthropic_tools_from_gateway_registry() -> None:
    client = LLMClient()
    anthropic_tools = client._openai_tools_to_anthropic(tools_for_llm())
    assert len(anthropic_tools) == len(TOOL_DEFINITIONS)
    for tool in anthropic_tools:
        schema = tool["input_schema"]
        assert schema["type"] == "object"
        assert "additionalProperties" in schema


def test_configure_channel_updates_schema_allows_extra_keys() -> None:
    tool = next(t for t in TOOL_DEFINITIONS if t["name"] == "configure_integrate_channel")
    schema = normalize_anthropic_input_schema(tool["parameters"])
    updates = schema["properties"]["updates"]
    assert updates["additionalProperties"] is True


def test_opus_47_omits_temperature() -> None:
    assert anthropic_supports_sampling("claude-3-5-haiku-20241022") is True
    assert anthropic_supports_sampling("claude-opus-4-7") is False
    assert anthropic_supports_sampling("claude-opus-4-7-20260416") is False

    payload = build_anthropic_messages_payload(
        [],
        model="claude-opus-4-7",
        max_tokens=1024,
        temperature=0.2,
        tools=None,
        system="You are helpful.",
        anthropic_messages=[{"role": "user", "content": "hi"}],
    )
    assert "temperature" not in payload

    payload_haiku = build_anthropic_messages_payload(
        [],
        model="claude-3-5-haiku-20241022",
        max_tokens=1024,
        temperature=0.2,
        tools=None,
        system=None,
        anthropic_messages=[{"role": "user", "content": "hi"}],
    )
    assert payload_haiku["temperature"] == 0.2
