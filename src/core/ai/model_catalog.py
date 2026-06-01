"""Fetch model IDs from configured LLM provider APIs (gateway agent settings)."""

from __future__ import annotations

from typing import Any

import httpx
from ollama import AsyncClient as OllamaAsyncClient
from ollama import ResponseError as OllamaResponseError

from config import Settings
from config.llm_providers import get_provider
from core.ai.llm_client import LLMClient, resolve_llm_config

# Source label constants
SRC_API = "api"
SRC_DEFAULT = "default"
SRC_MISSING_KEY = "missing_key"
SRC_OLLAMA_OFFLINE = "ollama_offline"
SRC_OLLAMA_EMPTY = "ollama_empty"


def _ollama_root(base_url: str) -> str:
    """Strip /v1 suffix to get the bare Ollama host URL."""
    root = base_url.rstrip("/")
    return root[:-3] if root.endswith("/v1") else root


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
    """List locally installed Ollama models via the official SDK."""
    client = OllamaAsyncClient(host=_ollama_root(base_url), timeout=timeout)
    response = await client.list()
    return [m.model for m in (response.models or []) if m.model]


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

    # Cloud providers require an API key before we can list models
    if cfg.requires_api_key and not cfg.api_key and not cfg.is_local:
        return {
            **base_payload,
            "models": fallback,
            "source": SRC_MISSING_KEY,
            "message": f"Enter an API key for {cfg.provider_label} to load available models",
        }

    client = LLMClient(settings)
    is_ollama = cfg.provider_id == "ollama" or cfg.is_local

    if is_ollama:
        # Try Ollama SDK list(); classify the failure with a specific source
        try:
            ids = await _fetch_ollama_tags(cfg.base_url, timeout)
        except (httpx.ConnectError, httpx.ConnectTimeout, ConnectionRefusedError):
            return {
                **base_payload,
                "models": fallback,
                "source": SRC_OLLAMA_OFFLINE,
                "message": f"Cannot connect to Ollama at {_ollama_root(cfg.base_url)}",
            }
        except OllamaResponseError as exc:
            return {
                **base_payload,
                "models": fallback,
                "source": SRC_OLLAMA_OFFLINE,
                "message": f"Ollama error {exc.status_code}: {exc.error}",
            }
        except Exception:
            # Fallback: try OpenAI-compatible /models endpoint (custom local servers)
            try:
                ids = await _fetch_openai_models(cfg.base_url, client._openai_headers(), timeout)
            except Exception as exc:
                return {
                    **base_payload,
                    "models": fallback,
                    "source": SRC_OLLAMA_OFFLINE,
                    "message": f"Ollama not reachable: {exc}",
                }

        if not ids:
            # Ollama is running but no models have been pulled yet
            return {
                **base_payload,
                "models": [],
                "source": SRC_OLLAMA_EMPTY,
                "message": "Ollama is running but no models are installed. Pull a model to get started.",
            }

        models = _model_items(ids)
        return {
            **base_payload,
            "models": models,
            "source": SRC_API,
            "message": f"{len(models)} local model(s) from Ollama",
        }

    # Cloud / custom provider
    try:
        ids: list[str] = []
        if cfg.api_style == "anthropic":
            ids = await _fetch_anthropic_models(cfg.base_url, client._anthropic_headers(), timeout)
        else:
            ids = await _fetch_openai_models(cfg.base_url, client._openai_headers(), timeout)

        models = _model_items(ids)
        if models:
            return {
                **base_payload,
                "models": models,
                "source": SRC_API,
                "message": f"{len(models)} model(s) from {cfg.provider_label}",
            }
    except Exception as exc:
        if fallback:
            return {
                **base_payload,
                "models": fallback,
                "source": SRC_DEFAULT,
                "message": f"Could not list models ({exc}); showing default",
            }
        return {
            **base_payload,
            "models": [],
            "source": SRC_DEFAULT,
            "message": str(exc),
        }

    return {
        **base_payload,
        "models": fallback,
        "source": SRC_DEFAULT,
        "message": "No models returned — using provider default",
    }


async def fetch_provider_models(settings: Settings) -> dict[str, Any]:
    """Backward-compatible alias."""
    return await fetch_agent_llm_models(settings)
