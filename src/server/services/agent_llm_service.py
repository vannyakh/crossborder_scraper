"""Gateway agent LLM — providers, models, health, and panel config updates."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from config import Settings, get_settings
from config.llm_providers import list_providers
from config.ui_store import UI_CONFIG_PATH, mask_api_key, panel_config_for_api
from core.ai.agent_llm import (
    AGENT_LLM_CONFIG_KEYS,
    agent_llm_ready,
    agent_llm_snapshot,
    merge_agent_probe,
)
from core.ai.health import check_agent_llm_health
from core.ai.llm_client import resolve_llm_config
from core.ai.model_catalog import fetch_agent_llm_models
from server.services.config import get_config_service
from server.services.context import AppContext, get_context


class AgentLlmService:
    """Single entry for panel Agent LLM settings and gateway runtime checks."""

    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    @property
    def settings(self) -> Settings:
        return self._ctx.settings

    def get_status(self) -> dict[str, Any]:
        panel = panel_config_for_api(mask_secrets=True)
        snapshot = agent_llm_snapshot(self.settings, panel=panel)
        if not snapshot.get("ai_api_key_masked") and self.settings.ai_api_key:
            snapshot["ai_api_key_masked"] = mask_api_key(self.settings.ai_api_key)
        return {
            **snapshot,
            "ui_config_path": str(UI_CONFIG_PATH),
            "secrets_from_env": False,
        }

    def list_providers(self) -> list[dict[str, Any]]:
        return list_providers()

    def _settings_for_probe(self, probe: dict[str, Any] | None) -> Settings:
        base = get_settings()
        return merge_agent_probe(base, probe)

    async def list_models(self, probe: dict[str, Any] | None = None) -> dict[str, Any]:
        settings = self._settings_for_probe(probe)
        return await fetch_agent_llm_models(settings)

    async def check_health(self, probe: dict[str, Any] | None = None) -> dict[str, Any]:
        settings = self._settings_for_probe(probe)
        allow_probe = bool(probe)
        return await check_agent_llm_health(settings, allow_disabled=allow_probe)

    def update_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        agent_updates = {k: v for k, v in updates.items() if k in AGENT_LLM_CONFIG_KEYS}
        if not agent_updates:
            return self.get_status()
        get_config_service().update_panel_config(agent_updates)
        self._ctx.reload_settings()
        return self.get_status()

    def _gateway_summary(self) -> dict[str, Any]:
        from server.services.gateway_service import get_gateway_service

        status = get_gateway_service().get_status()
        return {
            "tools_count": int(status.get("tools_count") or 0),
            "skills_count": int(status.get("skills_count") or 0),
            "enabled_skills_count": int(status.get("enabled_skills_count") or 0),
            "workflows_count": int(status.get("workflows_count") or 0),
            "schedules_count": int(status.get("schedules_count") or 0),
            "enabled_schedules_count": int(status.get("enabled_schedules_count") or 0),
        }

    def _build_setup_steps(
        self,
        settings: Settings,
        *,
        health_ok: bool | None,
        gateway: dict[str, Any],
    ) -> list[dict[str, Any]]:
        cfg = resolve_llm_config(settings)
        has_credentials = bool(settings.ai_api_key) or cfg.is_local or not cfg.requires_api_key
        provider_ok = bool(cfg.provider_id and cfg.model)
        enabled = settings.ai_enabled
        ready = agent_llm_ready(settings)

        connection_ok = health_ok if health_ok is not None else ready

        return [
            {
                "id": "provider",
                "label": "Choose provider and model",
                "detail": cfg.model_ref if provider_ok else "Pick a preset and model",
                "ok": provider_ok,
            },
            {
                "id": "credentials",
                "label": "Add API key or local endpoint",
                "detail": "Saved key or Ollama/local base URL",
                "ok": has_credentials,
            },
            {
                "id": "connection",
                "label": "Verify LLM connection",
                "detail": "Run Test connection after saving credentials",
                "ok": connection_ok,
            },
            {
                "id": "enable",
                "label": "Enable gateway agent LLM",
                "detail": "Required for chat, cron jobs, and integrate channels",
                "ok": enabled,
            },
            {
                "id": "skills",
                "label": "Install agent skills (optional)",
                "detail": "SKILL.md playbooks restrict tools and instructions",
                "ok": gateway["enabled_skills_count"] > 0,
                "optional": True,
            },
            {
                "id": "ready",
                "label": "Agent ready for chat and jobs",
                "detail": "Chat, cron schedules, and Telegram use this model",
                "ok": ready,
            },
        ]

    async def pull_ollama_model(self, model: str, base_url: str = "http://127.0.0.1:11434/v1") -> dict[str, Any]:
        """Trigger an Ollama model pull in the background; returns immediately."""
        root = base_url.rstrip("/")
        if root.endswith("/v1"):
            root = root[:-3]
        pull_url = f"{root}/api/pull"

        async def _do_pull() -> None:
            try:
                async with httpx.AsyncClient(timeout=600) as http:
                    await http.post(pull_url, json={"name": model, "stream": False})
            except Exception:
                pass

        asyncio.ensure_future(_do_pull())
        return {
            "ok": True,
            "model": model,
            "message": f"Pulling {model} in background. Refresh models in a moment.",
        }

    async def get_setup(self) -> dict[str, Any]:
        config = self.get_status()
        settings = self.settings
        health: dict[str, Any] | None = None
        health_ok: bool | None = None

        if settings.ai_enabled or settings.ai_api_key or settings.ai_model:
            health = await check_agent_llm_health(settings, allow_disabled=True)
            health_ok = bool(health.get("ok"))

        gateway = self._gateway_summary()
        steps = self._build_setup_steps(settings, health_ok=health_ok, gateway=gateway)
        ready = agent_llm_ready(settings)
        required_steps = [s for s in steps if not s.get("optional")]
        setup_complete = all(s["ok"] for s in required_steps)

        return {
            "config": config,
            "health": health,
            "gateway": gateway,
            "steps": steps,
            "setup_complete": setup_complete,
            "chat_ready": ready,
        }


_agent_llm: AgentLlmService | None = None


def get_agent_llm_service() -> AgentLlmService:
    global _agent_llm
    if _agent_llm is None:
        _agent_llm = AgentLlmService()
    return _agent_llm
