"""Panel and AI configuration."""

from __future__ import annotations

from typing import Any

from config.ui_store import (
    PANEL_SCALAR_KEYS,
    UI_CONFIG_PATH,
    mask_api_key,
    panel_config_for_api,
    save_panel_config,
)
from export.registry import EXPORTERS
from server.services.context import AppContext, get_context


class ConfigService:
    def __init__(self, ctx: AppContext | None = None) -> None:
        self._ctx = ctx or get_context()

    def get_panel_config(self) -> dict[str, Any]:
        s = self._ctx.settings
        data = panel_config_for_api(mask_secrets=True)
        data["ai_api_key_set"] = bool(s.ai_api_key)
        data["ai_base_url"] = s.ai_base_url
        data["proxy_server_set"] = bool(s.proxy_server)
        data["vpn_enabled"] = s.vpn_enabled
        data["vpn_mode"] = s.vpn_mode
        data["vpn_endpoint_set"] = bool(s.vpn_local_endpoint)
        if s.vpn_config_path:
            data["vpn_config_path"] = str(s.vpn_config_path)
        max_jobs = s.max_concurrent_jobs
        workers = data.get("scrape_default_workers") or max_jobs
        data["scrape_default_workers"] = min(int(workers), max_jobs)
        data["secrets_from_env"] = False
        data["secrets_from_panel_config"] = True
        mp_out: dict[str, Any] = {}
        for pid, entry in data.get("marketplaces", {}).items():
            mp_out[pid] = {
                **entry,
                "supports_export": pid in EXPORTERS,
            }
        data["marketplaces"] = mp_out
        return data

    def update_panel_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        updates = dict(updates)
        scalar: dict[str, Any] = {}
        marketplace_updates = updates.pop("marketplaces", None)
        for key in PANEL_SCALAR_KEYS:
            if key in updates:
                scalar[key] = updates[key]
        if scalar.get("scrape_default_workers") is not None:
            cap = self._ctx.settings.max_concurrent_jobs or 3
            scalar["scrape_default_workers"] = min(int(scalar["scrape_default_workers"]), cap)
        if scalar or marketplace_updates:
            scalar = self._normalize_ai_provider_updates(scalar)
            save_panel_config(
                scalar_updates=scalar or None,
                marketplace_updates=marketplace_updates,
            )
            self._ctx.reload_settings()
            self._ctx.schedule_engine_reset()
        return self.get_panel_config()

    def _normalize_ai_provider_updates(self, scalar: dict[str, Any]) -> dict[str, Any]:
        if not scalar:
            return scalar
        from config.llm_providers import apply_provider_defaults, get_provider, parse_model_ref

        if (
            "ai_model" in scalar
            and isinstance(scalar["ai_model"], str)
            and "/" in scalar["ai_model"]
        ):
            parsed_provider, parsed_model = parse_model_ref(scalar["ai_model"])
            scalar = dict(scalar)
            scalar.setdefault("ai_provider", parsed_provider)
            scalar["ai_model"] = parsed_model

        if "ai_provider" not in scalar:
            return scalar

        provider_id = str(scalar["ai_provider"])
        preset = get_provider(provider_id)
        scalar = dict(scalar)
        scalar["ai_provider"] = preset.id
        if not scalar.get("ai_base_url"):
            scalar["ai_base_url"] = preset.base_url
        if not scalar.get("ai_model"):
            scalar["ai_model"] = preset.default_model
        else:
            base_url, model = apply_provider_defaults(
                preset.id,
                base_url=scalar.get("ai_base_url"),
                model=scalar.get("ai_model"),
            )
            scalar["ai_base_url"] = base_url
            scalar["ai_model"] = model
        return scalar

    def get_ai_config(self) -> dict[str, Any]:
        from core.ai.llm_client import LLMClient, resolve_llm_config

        s = self._ctx.settings
        panel = panel_config_for_api(mask_secrets=True)
        cfg = resolve_llm_config(s)
        llm = LLMClient(s)
        return {
            "ai_provider": cfg.provider_id,
            "provider_label": cfg.provider_label,
            "model_ref": cfg.model_ref,
            "ai_enabled": s.ai_enabled,
            "ai_fallback": s.ai_fallback,
            "ai_agent_enabled": s.ai_agent_enabled,
            "ai_model": cfg.model,
            "ai_base_url": cfg.base_url,
            "ai_max_html_chars": s.ai_max_html_chars,
            "ai_timeout_seconds": s.ai_timeout_seconds,
            "ai_api_key_set": bool(s.ai_api_key),
            "ai_api_key_masked": panel.get("ai_api_key_masked") or mask_api_key(s.ai_api_key),
            "llm_ready": llm.enabled,
            "ui_config_path": str(UI_CONFIG_PATH),
            "secrets_from_env": False,
        }

    def update_ai_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        return self.update_panel_config(updates)

    def get_config(self) -> dict[str, Any]:
        s = self._ctx.settings
        return {
            "max_concurrent_jobs": s.max_concurrent_jobs,
            "scrape_default_workers": s.scrape_default_workers or s.max_concurrent_jobs,
            "proxy_list_path": str(s.proxy_list_path) if s.proxy_list_path else None,
            "proxy_rotation_strategy": s.proxy_rotation_strategy,
            "ai_enabled": s.ai_enabled,
            "ai_fallback": s.ai_fallback,
            "ai_agent_enabled": s.ai_agent_enabled,
            "ai_model": s.ai_model,
            "cookies_dir": str(s.cookies_dir),
            "output_dir": str(s.output_dir),
            "db_path": str(s.db_path),
            "headless": s.headless,
            "price_markup_percent": s.price_markup_percent,
            "ui_config_path": str(UI_CONFIG_PATH),
            "secrets_from_env": False,
            "secrets_from_panel_config": True,
        }


_config: ConfigService | None = None


def get_config_service() -> ConfigService:
    global _config
    if _config is None:
        _config = ConfigService()
    return _config
