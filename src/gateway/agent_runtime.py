"""Gateway agent runtime — LLM + tools loop (gateway pattern)."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from config import Settings
from core.ai.agent_llm import agent_llm_ready
from core.ai.llm_client import LLMClient, LLMRequestError
from gateway.prompts import DEFAULT_PROMPT_ID, load_prompt
from gateway.rules import get_rule_manager
from gateway.skills import get_skill_manager
from gateway.tools import execute_tool, parse_tool_call, tools_for_llm


def _json_default(value: Any) -> str:
    if isinstance(value, datetime | date):
        return value.isoformat()
    return str(value)


def tool_outcome_for_llm(outcome: Any) -> str:
    return json.dumps(outcome, ensure_ascii=False, default=_json_default)


def tool_outcome_for_log(outcome: Any) -> Any:
    return json.loads(json.dumps(outcome, ensure_ascii=False, default=_json_default))


_THINK_MODE_APPEND = """

## Think mode
Reason step-by-step before acting. Prefer calling tools to verify facts;
explain trade-offs briefly when helpful.
"""


class GatewayAgent:
    """
    Tool-using agent bound to the scrape gateway.

    Flow: user message → LLM (with tools) → tool execution → optional summary.
    System prompts load from libs/prompts/{prompt_id}.md.
    """

    FALLBACK_PROMPT = """You are the Cross-Border gateway agent.
Use available tools to scrape, list, export, and report status. Be concise."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.llm = LLMClient(self.settings)

    @property
    def enabled(self) -> bool:
        return agent_llm_ready(self.settings)

    async def run(
        self,
        message: str,
        *,
        manager: Any,
        prompt_id: str | None = None,
        skill_ids: list[str] | None = None,
        history: list[dict[str, str]] | None = None,
        session_context: str | None = None,
        max_tool_rounds: int = 3,
        think: bool = False,
    ) -> dict[str, Any]:
        if not self.enabled:
            return {
                "ok": False,
                "message": (
                    "Gateway agent LLM is disabled. Open Settings → Agent LLM, enable it, "
                    "pick a provider and model, then set an API key (or use local Ollama)."
                ),
                "tool_calls": [],
                "prompt_id": prompt_id or DEFAULT_PROMPT_ID,
                "skill_ids": [],
                "rule_ids": [],
                "provider": self.llm.cfg.provider_id,
                "model_ref": self.llm.cfg.model_ref,
            }

        resolved_id, base_prompt = load_prompt(prompt_id)
        rule_mgr = get_rule_manager()
        resolved_rules, prompt_with_rules = rule_mgr.apply_rules(base_prompt)
        skill_mgr = get_skill_manager()
        resolved_skills, system_prompt, skill_tools = skill_mgr.compose_instructions(
            prompt_with_rules,
            skill_ids=skill_ids,
        )
        if session_context:
            ctx = session_context.strip()
            system_prompt = f"{system_prompt.strip()}\n\n## Session context\n{ctx}"
        if think:
            system_prompt = f"{system_prompt.strip()}{_THINK_MODE_APPEND}"
            max_tool_rounds = max(max_tool_rounds, 5)
        allow_tools = skill_tools if skill_tools else None
        messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        if history:
            for turn in history:
                role = turn.get("role")
                content = str(turn.get("content") or "").strip()
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})
        tool_calls_log: list[dict[str, Any]] = []

        def _agent_error(message: str) -> dict[str, Any]:
            return {
                "ok": False,
                "message": message,
                "tool_calls": tool_calls_log,
                "prompt_id": resolved_id,
                "skill_ids": resolved_skills,
                "rule_ids": resolved_rules,
                "provider": self.llm.cfg.provider_id,
                "model_ref": self.llm.cfg.model_ref,
            }

        for _ in range(max_tool_rounds):
            try:
                result = await self.llm.chat(
                    messages,
                    tools=tools_for_llm(allow_names=allow_tools),
                )
            except LLMRequestError as exc:
                return _agent_error(str(exc))

            tool_calls = result.tool_calls

            if not tool_calls:
                return {
                    "ok": True,
                    "message": result.content or "",
                    "tool_calls": tool_calls_log,
                    "model": self.llm.cfg.model,
                    "provider": self.llm.cfg.provider_id,
                    "model_ref": self.llm.cfg.model_ref,
                    "prompt_id": resolved_id,
                    "skill_ids": resolved_skills,
                    "rule_ids": resolved_rules,
                }

            assistant_msg: dict[str, Any] = {
                "role": "assistant",
                "content": result.content,
                "tool_calls": tool_calls,
            }
            messages.append(assistant_msg)

            for call in tool_calls:
                parsed = parse_tool_call(call.get("function") or call)
                if not parsed:
                    continue
                name, args = parsed
                outcome = await execute_tool(name, args, manager=manager)
                tool_calls_log.append(
                    {
                        "name": name,
                        "arguments": args,
                        "outcome": tool_outcome_for_log(outcome),
                    }
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", name),
                        "content": tool_outcome_for_llm(outcome),
                    }
                )

        try:
            summary = await self.llm.chat(messages)
        except LLMRequestError as exc:
            return _agent_error(str(exc))
        final = summary.content or "Done."
        return {
            "ok": True,
            "message": final,
            "tool_calls": tool_calls_log,
            "model": self.llm.cfg.model,
            "provider": self.llm.cfg.provider_id,
            "model_ref": self.llm.cfg.model_ref,
            "prompt_id": resolved_id,
            "skill_ids": resolved_skills,
            "rule_ids": resolved_rules,
        }
