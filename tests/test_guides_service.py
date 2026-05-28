"""Panel setup guides API."""

import pytest

from server.services.guides_service import get_guides_service


def test_list_panel_guides() -> None:
    data = get_guides_service().list_guides()
    assert len(data["items"]) >= 7
    assert any(g["id"] == "agent-llm" for g in data["items"])


def test_get_panel_guide_loads_markdown() -> None:
    detail = get_guides_service().get_guide("agent-llm")
    assert detail["title"] == "Gateway agent LLM"
    assert "Gateway agent LLM" in detail["body_md"]
    assert detail["source_path"] == "libs/guides/agent-llm.md"


def test_guide_id_for_tool() -> None:
    svc = get_guides_service()
    assert svc.guide_id_for_tool("settings") == "agent-llm"
    assert svc.guide_id_for_tool("unknown-tool") is None


def test_unknown_guide_raises() -> None:
    with pytest.raises(LookupError):
        get_guides_service().get_guide("missing-guide")
