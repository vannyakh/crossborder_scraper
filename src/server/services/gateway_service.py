"""Gateway control plane — agent, schedules, workflows, and tool catalog."""

from __future__ import annotations

from typing import Any

from gateway.agent_runtime import GatewayAgent
from gateway.prompts import list_prompts
from gateway.schedules_store import (
    compute_next_run,
    delete_schedule,
    ensure_schedules_file,
    get_schedule,
    load_runs,
    load_schedules,
    upsert_schedule,
)
from gateway.tools import TOOL_DEFINITIONS
from gateway.workflows import WORKFLOW_TEMPLATES, run_workflow
from server.core.constants import APP_VERSION
from server.services.runtime import get_service_runtime
from server.services.update_service import get_update_service


class GatewayService:
    def get_status(self) -> dict[str, Any]:
        runtime = get_service_runtime()
        schedules = load_schedules() if _schedules_ready() else []
        enabled_schedules = sum(1 for s in schedules if s.get("enabled"))
        recent_runs = load_runs(limit=5) if _schedules_ready() else []
        failed_runs = sum(1 for r in recent_runs if r.get("ok") is False)
        from gateway.rules import get_rule_manager
        from gateway.skills import get_skill_manager

        skill_mgr = get_skill_manager()
        rule_mgr = get_rule_manager()
        update = get_update_service().get_status()
        from config.telegram_store import load_telegram_config

        tg = load_telegram_config()
        return {
            "service": "crossborder-scraper-gateway",
            "version": APP_VERSION,
            "update_available": update["update_available"],
            "latest_version": update.get("latest_version"),
            "control_plane": "fastapi",
            "clients": ["web-ui", "cli", "agent", "cron", "telegram"],
            "tools_count": len(TOOL_DEFINITIONS),
            "skills_count": len(skill_mgr.all_manifests()),
            "enabled_skills_count": len(skill_mgr.enabled_ids()),
            "rules_count": len(rule_mgr.all_manifests()),
            "enabled_rules_count": len(rule_mgr.enabled_ids()),
            "workflows_count": len(WORKFLOW_TEMPLATES),
            "schedules_count": len(schedules),
            "enabled_schedules_count": enabled_schedules,
            "recent_failed_runs": failed_runs,
            "runtime": runtime,
            "telegram": {
                "enabled": bool(tg.get("enabled")),
                "configured": bool(tg.get("bot_token")),
                "control_chats": len(tg.get("control_chat_ids") or []),
                "allow_any_chat": bool(tg.get("allow_any_chat")),
            },
        }

    def get_telegram_config(self) -> dict[str, Any]:
        from config.ui_store import panel_config_for_api

        return dict(panel_config_for_api(mask_secrets=True).get("telegram") or {})

    def update_telegram_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        from gateway.integrate.setup import configure_channel

        configure_channel("telegram", updates)
        from server.services.context import get_context

        get_context().reload_settings()
        return self.get_telegram_config()

    def list_integrate_channels(self) -> dict[str, Any]:
        from gateway.integrate.setup import list_channels

        items = list_channels()
        return {"items": items, "total": len(items)}

    def get_integrate_channel(self, channel_id: str) -> dict[str, Any]:
        from gateway.integrate.setup import get_channel

        return get_channel(channel_id)

    def update_integrate_channel(self, channel_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        from gateway.integrate.setup import configure_channel

        detail = configure_channel(channel_id, updates)
        if channel_id == "telegram":
            from server.services.context import get_context

            get_context().reload_settings()
        return detail

    async def reload_integrate_channel(self, channel_id: str) -> dict[str, Any]:
        from gateway.integrate.setup import reload_channel

        return await reload_channel(channel_id)

    def list_tools(self) -> list[dict[str, Any]]:
        return TOOL_DEFINITIONS

    def list_prompts(self) -> list[dict[str, Any]]:
        return list_prompts()  # type: ignore[return-value]

    def list_workflows(self) -> list[dict[str, Any]]:
        return [
            {
                "id": wf_id,
                "label": meta["label"],
                "description": meta["description"],
                "inputs": meta.get("inputs") or [],
                "steps": [s["tool"] for s in meta.get("steps") or []],
            }
            for wf_id, meta in WORKFLOW_TEMPLATES.items()
        ]

    def list_skills(self) -> dict[str, Any]:
        from gateway.skills import get_skill_manager

        mgr = get_skill_manager()
        return {
            "items": mgr.list_catalog(),
            "total": len(mgr.all_manifests()),
            "enabled": sorted(mgr.enabled_ids()),
        }

    def set_enabled_skills(self, skill_ids: list[str]) -> list[str]:
        from gateway.skills import get_skill_manager

        return get_skill_manager().set_enabled(skill_ids)

    def list_rules(self) -> dict[str, Any]:
        from gateway.rules import get_rule_manager

        mgr = get_rule_manager()
        return {
            "items": mgr.list_catalog(),
            "total": len(mgr.all_manifests()),
            "enabled": sorted(mgr.enabled_ids()),
        }

    def set_enabled_rules(self, rule_ids: list[str]) -> list[str]:
        from gateway.rules import get_rule_manager

        return get_rule_manager().set_enabled(rule_ids)

    def get_rule(self, rule_id: str) -> dict[str, Any]:
        from gateway.rules import get_rule_manager

        return get_rule_manager().get_detail(rule_id)

    def create_rule(self, payload: dict[str, Any]) -> dict[str, Any]:
        from gateway.rules import get_rule_manager

        return get_rule_manager().create_custom_rule(
            rule_id=payload["id"],
            name=payload["name"],
            description=payload.get("description") or "",
            category=payload.get("category") or "general",
            body=payload["body"],
            priority=int(payload.get("priority") or 50),
        )

    def update_rule(self, rule_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        from gateway.rules import get_rule_manager

        return get_rule_manager().update_custom_rule(rule_id, **patch)

    def delete_rule(self, rule_id: str) -> dict[str, Any]:
        from gateway.rules import get_rule_manager

        return get_rule_manager().delete_custom_rule(rule_id)

    async def browse_skill_registry(
        self,
        *,
        kind: str = "skill",
        sort: str = "downloads",
        limit: int = 24,
        cursor: str | None = None,
        q: str | None = None,
    ) -> dict[str, Any]:
        from gateway.skills import get_skill_manager
        from gateway.skills.registry_client import SkillRegistryError, browse_registry

        mgr = get_skill_manager()
        local = mgr.registry_match_ids()
        enabled = mgr.registry_enabled_ids()
        try:
            return await browse_registry(
                kind=kind,  # type: ignore[arg-type]
                sort=sort,  # type: ignore[arg-type]
                limit=limit,
                cursor=cursor,
                q=q,
                local_ids=local,
                enabled=enabled,
            )
        except SkillRegistryError as exc:
            raise RuntimeError(str(exc)) from exc

    async def get_registry_skill_detail(self, slug: str) -> dict[str, Any]:
        from gateway.skills import get_skill_manager
        from gateway.skills.registry_client import SkillRegistryError, fetch_registry_skill_detail

        mgr = get_skill_manager()
        try:
            detail = await fetch_registry_skill_detail(slug)
        except SkillRegistryError as exc:
            raise RuntimeError(str(exc)) from exc
        skill_id = mgr.resolve_registry_slug(slug) or slug.strip()
        manifests = mgr.all_manifests()
        state = mgr.load_installed_state().get("skills") or {}
        meta = state.get(skill_id) if isinstance(state.get(skill_id), dict) else {}
        manifest = manifests.get(skill_id)
        local_version = str(meta.get("version") or (manifest.version if manifest else "") or "")
        detail["installed"] = skill_id in manifests
        detail["enabled"] = skill_id in mgr.enabled_ids()
        detail["local_version"] = local_version
        return detail

    async def install_skill_from_registry(
        self,
        *,
        slug: str,
        version: str | None = None,
        replace: bool = False,
    ) -> dict[str, Any]:
        from gateway.skills import SkillInstallError, get_skill_installer
        from gateway.skills.registry_client import (
            SkillRegistryError,
            download_registry_skill,
            registry_base_url,
        )

        try:
            archive = await download_registry_skill(slug=slug, version=version)
            return get_skill_installer().install_zip(
                archive,
                replace=replace,
                slug=slug.strip(),
                registry=registry_base_url(),
            )
        except SkillRegistryError as exc:
            raise RuntimeError(str(exc)) from exc
        except SkillInstallError as exc:
            raise ValueError(str(exc)) from exc

    async def update_skill_from_registry(
        self,
        slug: str,
        *,
        version: str | None = None,
    ) -> dict[str, Any]:
        return await self.install_skill_from_registry(
            slug=slug,
            version=version,
            replace=True,
        )

    async def run_agent(
        self,
        message: str,
        *,
        prompt_id: str | None = None,
        skill_ids: list[str] | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        from gateway.chat_sessions import append_turn, get_session, history_for_llm
        from server.manager import get_manager

        mgr = get_manager()
        agent = GatewayAgent(mgr.settings)
        history = None
        resolved_prompt = prompt_id
        if session_id:
            session = get_session(session_id)
            if session is None:
                raise LookupError("session not found")
            history = history_for_llm(session.get("messages") or [])
            if not resolved_prompt:
                resolved_prompt = session.get("prompt_id")

        result = await agent.run(
            message.strip(),
            manager=mgr,
            prompt_id=resolved_prompt,
            skill_ids=skill_ids,
            history=history,
        )

        if session_id:
            append_turn(
                session_id,
                user_message=message.strip(),
                assistant_message=str(result.get("message") or ""),
                ok=bool(result.get("ok")),
                tool_calls=result.get("tool_calls") or [],
                model_ref=result.get("model_ref"),
                prompt_id=result.get("prompt_id") or resolved_prompt,
            )
            result["session_id"] = session_id
            if session:
                result["channel_id"] = session.get("channel_id")
                result["platform_chat_id"] = session.get("platform_chat_id")

        return result

    def list_chat_sessions(self, *, channel_id: str | None = None) -> dict[str, Any]:
        from gateway.chat_sessions import list_sessions_payload

        return list_sessions_payload(channel_id=channel_id)

    def get_chat_session(self, session_id: str) -> dict[str, Any]:
        from gateway.chat_sessions import get_session

        session = get_session(session_id)
        if session is None:
            raise LookupError("session not found")
        return session

    def create_chat_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        from gateway.chat_sessions import create_session

        return create_session(
            label=payload.get("label"),
            prompt_id=payload.get("prompt_id"),
            channel_id=str(payload.get("channel_id") or "panel"),
            platform_chat_id=payload.get("platform_chat_id"),
        )

    def update_chat_session(self, session_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        from gateway.chat_sessions import update_session

        return update_session(session_id, patch)

    def delete_chat_session(self, session_id: str) -> bool:
        from gateway.chat_sessions import delete_session

        return delete_session(session_id)

    async def run_workflow(self, workflow_id: str, *, inputs: dict[str, Any]) -> dict[str, Any]:
        from server.manager import get_manager

        if workflow_id not in WORKFLOW_TEMPLATES:
            raise ValueError(f"unknown workflow: {workflow_id}")
        return await run_workflow(workflow_id, inputs=inputs, manager=get_manager())

    def list_schedules(self) -> list[dict[str, Any]]:
        ensure_schedules_file()
        return load_schedules()

    def create_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        compute_next_run(payload["cron"])
        return upsert_schedule(payload)

    def update_schedule(self, schedule_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        existing = get_schedule(schedule_id)
        if not existing:
            raise LookupError("schedule not found")
        if "cron" in patch:
            patch["next_run_at"] = compute_next_run(patch["cron"])
        return upsert_schedule({**existing, **patch, "id": schedule_id})

    def delete_schedule(self, schedule_id: str) -> bool:
        return delete_schedule(schedule_id)

    async def run_schedule_now(self, schedule_id: str) -> dict[str, Any]:
        from gateway.scheduler import get_scheduler

        return await get_scheduler().run_schedule(schedule_id, trigger="manual")

    def list_runs(self, *, limit: int = 30) -> list[dict[str, Any]]:
        return load_runs(limit=limit)


def _schedules_ready() -> bool:
    try:
        ensure_schedules_file()
        return True
    except Exception:
        return False


_gateway_service: GatewayService | None = None


def get_gateway_service() -> GatewayService:
    global _gateway_service
    if _gateway_service is None:
        _gateway_service = GatewayService()
    return _gateway_service
