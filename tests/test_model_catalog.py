"""LLM model catalog for scrape settings."""

import asyncio

from config import Settings
from core.ai.model_catalog import fetch_provider_models


def test_fetch_provider_models_without_key_uses_default() -> None:
    settings = Settings(
        ai_enabled=True, ai_provider="openai", ai_model="gpt-4o-mini", ai_api_key=None
    )
    result = asyncio.run(fetch_provider_models(settings))
    assert result["provider"] == "openai"
    assert result["source"] == "missing_key"
    assert any(m["id"] == "gpt-4o-mini" for m in result["models"])
