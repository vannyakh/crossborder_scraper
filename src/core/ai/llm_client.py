"""Unified LLM client for extraction, scrape agent, and gateway agent."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from config import Settings
from config.llm_providers import ApiStyle, apply_provider_defaults, get_provider, infer_provider_id


@dataclass(frozen=True)
class ResolvedLLMConfig:
    provider_id: str
    provider_label: str
    api_style: ApiStyle
    base_url: str
    model: str
    api_key: str | None
    timeout_seconds: float
    requires_api_key: bool

    @property
    def is_local(self) -> bool:
        host = self.base_url.lower()
        return "127.0.0.1" in host or "localhost" in host


@dataclass
class LLMChatResult:
    content: str | None
    tool_calls: list[dict[str, Any]]
    raw: dict[str, Any]


def resolve_llm_config(settings: Settings) -> ResolvedLLMConfig:
    provider_id = getattr(settings, "ai_provider", None) or infer_provider_id(
        base_url=settings.ai_base_url,
        model=settings.ai_model,
    )
    preset = get_provider(provider_id)
    base_url, model = apply_provider_defaults(
        preset.id,
        base_url=settings.ai_base_url,
        model=settings.ai_model,
    )
    return ResolvedLLMConfig(
        provider_id=preset.id,
        provider_label=preset.label,
        api_style=preset.api_style,
        base_url=base_url.rstrip("/"),
        model=model,
        api_key=settings.ai_api_key,
        timeout_seconds=float(settings.ai_timeout_seconds),
        requires_api_key=preset.requires_api_key,
    )


class LLMClient:
    """Provider-aware chat client (OpenAI-compatible, Anthropic Messages, local Ollama)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.cfg = resolve_llm_config(self.settings)

    @property
    def enabled(self) -> bool:
        if not self.settings.ai_enabled:
            return False
        if self.cfg.requires_api_key and not self.cfg.api_key:
            return self.cfg.is_local
        return bool(self.cfg.api_key or self.cfg.is_local or self.cfg.base_url)

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
        response_format: dict[str, Any] | None = None,
        max_tokens: int | None = None,
    ) -> LLMChatResult:
        if self.cfg.api_style == "anthropic":
            return await self._chat_anthropic(
                messages,
                tools=tools,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        return await self._chat_openai_compatible(
            messages,
            tools=tools,
            temperature=temperature,
            response_format=response_format,
            max_tokens=max_tokens,
        )

    def _openai_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.cfg.api_key:
            headers["Authorization"] = f"Bearer {self.cfg.api_key}"
        return headers

    async def _chat_openai_compatible(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
        temperature: float,
        response_format: dict[str, Any] | None,
        max_tokens: int | None,
    ) -> LLMChatResult:
        payload: dict[str, Any] = {
            "model": self.cfg.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if response_format:
            payload["response_format"] = response_format
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=self.cfg.timeout_seconds) as client:
            resp = await client.post(
                f"{self.cfg.base_url}/chat/completions",
                headers=self._openai_headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        choice = data["choices"][0]["message"]
        return LLMChatResult(
            content=choice.get("content"),
            tool_calls=list(choice.get("tool_calls") or []),
            raw=data,
        )

    def _anthropic_headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }
        if self.cfg.api_key:
            headers["x-api-key"] = self.cfg.api_key
        return headers

    def _openai_tools_to_anthropic(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for tool in tools:
            fn = tool.get("function") or tool
            out.append(
                {
                    "name": fn.get("name", ""),
                    "description": fn.get("description", ""),
                    "input_schema": fn.get("parameters") or {"type": "object", "properties": {}},
                }
            )
        return out

    def _anthropic_messages_payload(
        self, messages: list[dict[str, Any]]
    ) -> tuple[str | None, list[dict[str, Any]]]:
        system_parts: list[str] = []
        anthropic_messages: list[dict[str, Any]] = []

        for msg in messages:
            role = msg.get("role")
            if role == "system":
                content = msg.get("content")
                if content:
                    system_parts.append(str(content))
                continue
            if role == "tool":
                anthropic_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": msg.get("tool_call_id", "tool"),
                                "content": str(msg.get("content", "")),
                            }
                        ],
                    }
                )
                continue
            if role == "assistant" and msg.get("tool_calls"):
                blocks: list[dict[str, Any]] = []
                if msg.get("content"):
                    blocks.append({"type": "text", "text": str(msg["content"])})
                for call in msg["tool_calls"]:
                    fn = call.get("function") or {}
                    args_raw = fn.get("arguments") or "{}"
                    try:
                        args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
                    except json.JSONDecodeError:
                        args = {}
                    blocks.append(
                        {
                            "type": "tool_use",
                            "id": call.get("id", fn.get("name", "tool")),
                            "name": fn.get("name", ""),
                            "input": args if isinstance(args, dict) else {},
                        }
                    )
                anthropic_messages.append({"role": "assistant", "content": blocks})
                continue
            role_name = role if role in ("user", "assistant") else "user"
            anthropic_messages.append(
                {"role": role_name, "content": msg.get("content", "")},
            )

        system = "\n\n".join(system_parts) if system_parts else None
        return system, anthropic_messages

    def _anthropic_to_openai_tool_calls(
        self, content: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        tool_calls: list[dict[str, Any]] = []
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            tool_calls.append(
                {
                    "id": block.get("id", block.get("name", "tool")),
                    "type": "function",
                    "function": {
                        "name": block.get("name", ""),
                        "arguments": json.dumps(block.get("input") or {}, ensure_ascii=False),
                    },
                }
            )
        return tool_calls

    async def _chat_anthropic(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
        temperature: float,
        max_tokens: int | None,
    ) -> LLMChatResult:
        system, anthropic_messages = self._anthropic_messages_payload(messages)
        payload: dict[str, Any] = {
            "model": self.cfg.model,
            "max_tokens": max_tokens or 4096,
            "messages": anthropic_messages,
            "temperature": temperature,
        }
        if system:
            payload["system"] = system
        if tools:
            payload["tools"] = self._openai_tools_to_anthropic(tools)

        url = f"{self.cfg.base_url.rstrip('/')}/v1/messages"
        async with httpx.AsyncClient(timeout=self.cfg.timeout_seconds) as client:
            resp = await client.post(url, headers=self._anthropic_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()

        content_blocks = data.get("content") or []
        text_parts: list[str] = []
        if isinstance(content_blocks, list):
            for block in content_blocks:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(str(block.get("text", "")))
        tool_calls = (
            self._anthropic_to_openai_tool_calls(content_blocks)
            if isinstance(content_blocks, list)
            else []
        )
        return LLMChatResult(
            content="\n".join(text_parts).strip() or None,
            tool_calls=tool_calls,
            raw=data,
        )
