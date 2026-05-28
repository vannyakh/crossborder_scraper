"""Gateway agent LLM — shared config resolution, readiness, and probe merging."""

from __future__ import annotations

from typing import Any

from config import Settings
from core.ai.llm_client import LLMClient, resolve_llm_config

AGENT_LLM_CONFIG_KEYS = frozenset(
    {
        "ai_provider",
        "ai_enabled",
        "ai_model",
        "ai_base_url",
        "ai_api_key",
        "ai_timeout_seconds",
    }
)


def merge_agent_probe(settings: Settings, probe: dict[str, Any] | None) -> Settings:
    """Apply draft panel fields onto saved settings (models list, health test)."""
    if not probe:
        return settings
    updates: dict[str, Any] = {}
    for key in AGENT_LLM_CONFIG_KEYS:
        if key not in probe:
            continue
        value = probe[key]
        if key == "ai_api_key" and not (isinstance(value, str) and value.strip()):
            continue
        if value is not None:
            updates[key] = value
    if not updates:
        return settings
    return settings.model_copy(update=updates)


def agent_llm_ready(settings: Settings) -> bool:
    """True when gateway agent LLM can accept chat/tool requests."""
    if not settings.ai_enabled:
        return False
    return LLMClient(settings).enabled


def agent_llm_snapshot(
    settings: Settings, *, panel: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Runtime status for gateway agent LLM (flat dict for API compatibility)."""
    cfg = resolve_llm_config(settings)
    masked = (panel or {}).get("ai_api_key_masked")
    return {
        "ai_provider": cfg.provider_id,
        "provider_label": cfg.provider_label,
        "model_ref": cfg.model_ref,
        "ai_enabled": settings.ai_enabled,
        "ai_model": cfg.model,
        "ai_base_url": cfg.base_url,
        "ai_timeout_seconds": settings.ai_timeout_seconds,
        "ai_api_key_set": bool(settings.ai_api_key),
        "ai_api_key_masked": masked,
        "llm_ready": agent_llm_ready(settings),
        # Scrape pipeline fields — same LLM connection, separate toggles
        "ai_fallback": settings.ai_fallback,
        "ai_agent_enabled": settings.ai_agent_enabled,
        "ai_max_html_chars": settings.ai_max_html_chars,
    }
