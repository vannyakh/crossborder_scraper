from typing import Any

import httpx

from config import Settings
from core.ai.llm_client import LLMClient, resolve_llm_config


async def check_llm_health(settings: Settings) -> dict[str, Any]:
    """Probe the configured LLM provider endpoint."""
    cfg = resolve_llm_config(settings)
    base: dict[str, Any] = {
        "model": cfg.model,
        "model_ref": cfg.model_ref,
        "base_url": cfg.base_url,
        "provider": cfg.provider_id,
        "provider_label": cfg.provider_label,
    }

    if not settings.ai_enabled:
        return {
            **base,
            "ok": False,
            "status": "disabled",
            "message": "AI extraction is disabled",
        }

    if cfg.requires_api_key and not cfg.api_key and not cfg.is_local:
        return {
            **base,
            "ok": False,
            "status": "missing_key",
            "message": f"Set an API key for {cfg.provider_label}",
        }

    client = LLMClient(settings)
    timeout = min(cfg.timeout_seconds, 15.0)

    try:
        if cfg.api_style == "anthropic":
            headers = client._anthropic_headers()
            async with httpx.AsyncClient(timeout=timeout) as http:
                resp = await http.post(
                    f"{cfg.base_url.rstrip('/')}/v1/messages",
                    headers=headers,
                    json={
                        "model": cfg.model,
                        "max_tokens": 16,
                        "messages": [{"role": "user", "content": "ping"}],
                    },
                )
                resp.raise_for_status()
            return {
                **base,
                "ok": True,
                "status": "ready",
                "message": f"{cfg.provider_label} responded",
                "probe": "anthropic/messages",
            }

        headers = client._openai_headers()
        async with httpx.AsyncClient(timeout=timeout) as http:
            models_resp = await http.get(f"{cfg.base_url}/models", headers=headers)
            if models_resp.status_code == 404:
                probe = await http.post(
                    f"{cfg.base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": cfg.model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 1,
                    },
                )
                probe.raise_for_status()
                return {
                    **base,
                    "ok": True,
                    "status": "ready",
                    "message": f"{cfg.provider_label} endpoint responded",
                    "probe": "chat/completions",
                }

            models_resp.raise_for_status()
            body = models_resp.json()
            models = body.get("data") if isinstance(body, dict) else None
            count = len(models) if isinstance(models, list) else None
            configured_available = None
            if isinstance(models, list):
                ids = {m.get("id") for m in models if isinstance(m, dict)}
                configured_available = cfg.model in ids

            return {
                **base,
                "ok": True,
                "status": "ready",
                "message": f"{cfg.provider_label} models endpoint reachable",
                "models_count": count,
                "model_available": configured_available,
                "probe": "models",
            }
    except httpx.TimeoutException:
        return {
            **base,
            "ok": False,
            "status": "timeout",
            "message": f"LLM probe timed out after {timeout}s",
        }
    except httpx.HTTPStatusError as exc:
        return {
            **base,
            "ok": False,
            "status": "http_error",
            "message": f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
        }
    except Exception as exc:
        return {
            **base,
            "ok": False,
            "status": "error",
            "message": str(exc),
        }
