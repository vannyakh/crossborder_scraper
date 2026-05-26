from typing import Any

import httpx

from config import Settings


async def check_llm_health(settings: Settings) -> dict[str, Any]:
    """Probe the configured OpenAI-compatible LLM endpoint."""
    if not settings.ai_enabled:
        return {
            "ok": False,
            "status": "disabled",
            "message": "AI extraction is disabled",
            "model": settings.ai_model,
            "base_url": settings.ai_base_url,
        }

    base = settings.ai_base_url.rstrip("/")
    has_key = bool(settings.ai_api_key)
    local = "localhost" in base or "127.0.0.1" in base

    if not has_key and not local:
        return {
            "ok": False,
            "status": "missing_key",
            "message": "Set an API key or use a local LLM base URL",
            "model": settings.ai_model,
            "base_url": base,
        }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if has_key:
        headers["Authorization"] = f"Bearer {settings.ai_api_key}"

    timeout = min(settings.ai_timeout_seconds, 15.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            models_resp = await client.get(f"{base}/models", headers=headers)
            if models_resp.status_code == 404:
                probe = await client.post(
                    f"{base}/chat/completions",
                    headers=headers,
                    json={
                        "model": settings.ai_model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 1,
                    },
                )
                probe.raise_for_status()
                return {
                    "ok": True,
                    "status": "ready",
                    "message": "LLM endpoint responded",
                    "model": settings.ai_model,
                    "base_url": base,
                    "probe": "chat/completions",
                }

            models_resp.raise_for_status()
            body = models_resp.json()
            models = body.get("data") if isinstance(body, dict) else None
            count = len(models) if isinstance(models, list) else None
            configured_available = None
            if isinstance(models, list):
                ids = {m.get("id") for m in models if isinstance(m, dict)}
                configured_available = settings.ai_model in ids

            return {
                "ok": True,
                "status": "ready",
                "message": "LLM models endpoint reachable",
                "model": settings.ai_model,
                "base_url": base,
                "models_count": count,
                "model_available": configured_available,
                "probe": "models",
            }
    except httpx.TimeoutException:
        return {
            "ok": False,
            "status": "timeout",
            "message": f"LLM probe timed out after {timeout}s",
            "model": settings.ai_model,
            "base_url": base,
        }
    except httpx.HTTPStatusError as exc:
        return {
            "ok": False,
            "status": "http_error",
            "message": f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
            "model": settings.ai_model,
            "base_url": base,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": "error",
            "message": str(exc),
            "model": settings.ai_model,
            "base_url": base,
        }
