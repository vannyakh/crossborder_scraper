"""Fetch model IDs from configured LLM provider APIs (gateway agent settings)."""

from __future__ import annotations

from typing import Any

import httpx

from config import Settings
from config.llm_providers import get_provider
from core.ai.llm_client import LLMClient, resolve_llm_config


def _model_items(ids: list[str]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for raw in ids:
        mid = (raw or "").strip()
        if not mid or mid in seen:
            continue
        seen.add(mid)
        out.append({"id": mid, "label": mid})
    return out


async def _fetch_ollama_tags(base_url: str, timeout: float) -> list[str]:
    root = base_url.rstrip("/")
    if root.endswith("/v1"):
        root = root[:-3]
    async with httpx.AsyncClient(timeout=timeout) as http:
        resp = await http.get(f"{root}/api/tags")
        resp.raise_for_status()
        body = resp.json()
    models = body.get("models") if isinstance(body, dict) else None
    if not isinstance(models, list):
        return []
    return [str(m.get("name", "")).strip() for m in models if isinstance(m, dict)]


async def _fetch_openai_models(base_url: str, headers: dict[str, str], timeout: float) -> list[str]:
    async with httpx.AsyncClient(timeout=timeout) as http:
        resp = await http.get(f"{base_url.rstrip('/')}/models", headers=headers)
        resp.raise_for_status()
        body = resp.json()
    models = body.get("data") if isinstance(body, dict) else None
    if not isinstance(models, list):
        return []
    return [str(m.get("id", "")).strip() for m in models if isinstance(m, dict)]


async def _fetch_anthropic_models(
    base_url: str, headers: dict[str, str], timeout: float
) -> list[str]:
    async with httpx.AsyncClient(timeout=timeout) as http:
        resp = await http.get(f"{base_url.rstrip('/')}/v1/models", headers=headers)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        body = resp.json()
    models = body.get("data") if isinstance(body, dict) else None
    if not isinstance(models, list):
        return []
    return [str(m.get("id", "")).strip() for m in models if isinstance(m, dict)]


async def fetch_agent_llm_models(settings: Settings) -> dict[str, Any]:
    """List models for gateway agent LLM — live provider API when credentials allow."""
    cfg = resolve_llm_config(settings)
    preset = get_provider(cfg.provider_id)
    timeout = min(cfg.timeout_seconds, 20.0)

    base_payload = {
        "provider": cfg.provider_id,
        "provider_label": cfg.provider_label,
    }

    if preset.default_model:
        fallback = _model_items([preset.default_model])
    else:
        fallback = []

    if cfg.requires_api_key and not cfg.api_key and not cfg.is_local:
        return {
            **base_payload,
            "models": fallback,
            "source": "default",
            "message": f"Add an API key for {cfg.provider_label} to load models from the provider",
        }

    client = LLMClient(settings)
    try:
        ids: list[str] = []
        if cfg.provider_id == "ollama" or cfg.is_local:
            try:
                ids = await _fetch_ollama_tags(cfg.base_url, timeout)
            except Exception:
                ids = await _fetch_openai_models(cfg.base_url, client._openai_headers(), timeout)
        elif cfg.api_style == "anthropic":
            ids = await _fetch_anthropic_models(cfg.base_url, client._anthropic_headers(), timeout)
        else:
            ids = await _fetch_openai_models(cfg.base_url, client._openai_headers(), timeout)

        models = _model_items(ids)
        if models:
            return {
                **base_payload,
                "models": models,
                "source": "api",
                "message": f"{len(models)} model(s) from {cfg.provider_label}",
            }
    except Exception as exc:
        if fallback:
            return {
                **base_payload,
                "models": fallback,
                "source": "default",
                "message": f"Could not list models ({exc}); showing default",
            }
        return {
            **base_payload,
            "models": [],
            "source": "default",
            "message": str(exc),
        }

    return {
        **base_payload,
        "models": fallback,
        "source": "default",
        "message": "No models returned — using provider default",
    }


async def fetch_provider_models(settings: Settings) -> dict[str, Any]:
    """Backward-compatible alias."""
    return await fetch_agent_llm_models(settings)
