"""Gateway agent runtime — LLM + tools loop (OpenClaw gateway pattern)."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from loguru import logger

from config import Settings
from gateway.tools import execute_tool, parse_tool_call, tools_for_llm


from gateway.prompts import DEFAULT_PROMPT_ID, load_prompt


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

    @property
    def enabled(self) -> bool:
        return self.settings.ai_enabled and bool(self.settings.ai_api_key or self.settings.ai_base_url)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.settings.ai_api_key:
            headers["Authorization"] = f"Bearer {self.settings.ai_api_key}"
        return headers

    async def run(
        self,
        message: str,
        *,
        manager: Any,
        prompt_id: str | None = None,
        max_tool_rounds: int = 3,
    ) -> dict[str, Any]:
        if not self.enabled:
            return {
                "ok": False,
                "message": "AI agent disabled. Enable ai_enabled and set ai_api_key in panel config.",
                "tool_calls": [],
                "prompt_id": prompt_id or DEFAULT_PROMPT_ID,
            }

        resolved_id, system_prompt = load_prompt(prompt_id)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ]
        tool_calls_log: list[dict[str, Any]] = []

        for _ in range(max_tool_rounds):
            response = await self._chat(messages, tools=tools_for_llm())
            choice = response["choices"][0]["message"]
            tool_calls = choice.get("tool_calls") or []

            if not tool_calls:
                return {
                    "ok": True,
                    "message": choice.get("content") or "",
                    "tool_calls": tool_calls_log,
                    "model": self.settings.ai_model,
                    "prompt_id": resolved_id,
                }

            messages.append(choice)
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

        summary = await self._chat(messages, tools=None)
        final = summary["choices"][0]["message"].get("content") or "Done."
        return {
            "ok": True,
            "message": final,
            "tool_calls": tool_calls_log,
            "model": self.settings.ai_model,
            "prompt_id": resolved_id,
        }

    async def _chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.settings.ai_model,
            "messages": messages,
            "temperature": 0.2,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        base = self.settings.ai_base_url.rstrip("/")
        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            resp = await client.post(
                f"{base}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
