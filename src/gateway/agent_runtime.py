"""Gateway agent runtime — LLM + tools loop (gateway pattern)."""

from __future__ import annotations

import json
from typing import Any

from config import Settings
from core.ai.llm_client import LLMClient
from gateway.prompts import DEFAULT_PROMPT_ID, load_prompt
from gateway.skills import get_skill_manager
from gateway.tools import execute_tool, parse_tool_call, tools_for_llm


class GatewayAgent:
    """
    Tool-using agent bound to the scrape gateway.

    Flow: user message → LLM (with tools) → tool execution → optional summary.
    System prompts load from libs/prompts/{prompt_id}.md.
    """

    FALLBACK_PROMPT = """You are the Crossborder Scraper gateway agent.
Use available tools to scrape, list, export, and report status. Be concise."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.llm = LLMClient(self.settings)

    @property
    def enabled(self) -> bool:
        return self.settings.ai_enabled and self.llm.enabled

    async def run(
        self,
        message: str,
        *,
        manager: Any,
        prompt_id: str | None = None,
        skill_ids: list[str] | None = None,
        max_tool_rounds: int = 3,
    ) -> dict[str, Any]:
        if not self.enabled:
            return {
                "ok": False,
                "message": (
                    "AI agent disabled. Enable AI in Settings, pick a provider, "
                    "and set an API key (or use local Ollama)."
                ),
                "tool_calls": [],
                "prompt_id": prompt_id or DEFAULT_PROMPT_ID,
                "skill_ids": [],
                "provider": self.llm.cfg.provider_id,
            }

        resolved_id, base_prompt = load_prompt(prompt_id)
        skill_mgr = get_skill_manager()
        resolved_skills, system_prompt, skill_tools = skill_mgr.compose_instructions(
            base_prompt,
            skill_ids=skill_ids,
        )
        allow_tools = skill_tools if skill_tools else None
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ]
        tool_calls_log: list[dict[str, Any]] = []

        for _ in range(max_tool_rounds):
            result = await self.llm.chat(
                messages,
                tools=tools_for_llm(allow_names=allow_tools),
            )
            tool_calls = result.tool_calls

            if not tool_calls:
                return {
                    "ok": True,
                    "message": result.content or "",
                    "tool_calls": tool_calls_log,
                    "model": self.llm.cfg.model,
                    "provider": self.llm.cfg.provider_id,
                    "prompt_id": resolved_id,
                    "skill_ids": resolved_skills,
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
                tool_calls_log.append({"name": name, "arguments": args, "outcome": outcome})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", name),
                        "content": json.dumps(outcome, ensure_ascii=False),
                    }
                )

        summary = await self.llm.chat(messages)
        final = summary.content or "Done."
        return {
            "ok": True,
            "message": final,
            "tool_calls": tool_calls_log,
            "model": self.llm.cfg.model,
            "provider": self.llm.cfg.provider_id,
            "prompt_id": resolved_id,
            "skill_ids": resolved_skills,
        }
