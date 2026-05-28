"""Unified LLM client for scrape extraction and gateway agent tools."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from config import Settings
from config.llm_providers import (
    ApiStyle,
    apply_provider_defaults,
    format_model_ref,
    get_provider,
    infer_provider_id,
)


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

    @property
    def model_ref(self) -> str:
        return format_model_ref(self.provider_id, self.model)


@dataclass
class LLMChatResult:
    content: str | None
    tool_calls: list[dict[str, Any]]
    raw: dict[str, Any]


class LLMRequestError(Exception):
    """LLM provider returned an error (HTTP or invalid request)."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def format_llm_http_error(exc: httpx.HTTPStatusError) -> str:
    try:
        body = exc.response.json()
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict) and err.get("message"):
                return f"HTTP {exc.response.status_code}: {err['message']}"
            if isinstance(err, str):
                return f"HTTP {exc.response.status_code}: {err}"
    except Exception:
        pass
    text = (exc.response.text or exc.response.reason_phrase or "request failed").strip()
    return f"HTTP {exc.response.status_code}: {text[:300]}"


def normalize_anthropic_input_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Make OpenAI-style JSON Schema valid for Anthropic Messages tool definitions."""
    if not isinstance(schema, dict):
        return {"type": "object", "properties": {}, "additionalProperties": False}

    schema_type = schema.get("type")
    if schema_type == "array":
        items = schema.get("items")
        if isinstance(items, dict):
            return {**schema, "items": normalize_anthropic_input_schema(items)}
        return schema

    if (
        schema_type == "object"
        or "properties" in schema
        or schema.get("additionalProperties") is not None
    ):
        props = schema.get("properties")
        if not isinstance(props, dict):
            props = {}
        normalized_props = {
            key: normalize_anthropic_input_schema(val) if isinstance(val, dict) else val
            for key, val in props.items()
        }
        out: dict[str, Any] = {"type": "object", "properties": normalized_props}
        if schema.get("description"):
            out["description"] = schema["description"]
        if schema.get("required"):
            out["required"] = schema["required"]
        if "additionalProperties" in schema:
            out["additionalProperties"] = schema["additionalProperties"]
        elif not normalized_props and schema.get("description"):
            out["additionalProperties"] = True
        else:
            out["additionalProperties"] = False
        return out

    return schema


def anthropic_supports_sampling(model: str) -> bool:
    """Claude Opus 4.7+ rejects temperature, top_p, and top_k in Messages API."""
    mid = (model or "").lower()
    if "opus-4-7" in mid or "opus-4.7" in mid:
        return False
    return True


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


def build_anthropic_messages_payload(
    messages: list[dict[str, Any]],
    *,
    model: str,
    max_tokens: int,
    temperature: float,
    tools: list[dict[str, Any]] | None,
    system: str | None,
    anthropic_messages: list[dict[str, Any]],
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": anthropic_messages,
    }
    if anthropic_supports_sampling(model):
        payload["temperature"] = temperature
    if system:
        payload["system"] = system
    if tools:
        payload["tools"] = tools
    return payload


def anthropic_temperature_deprecated_response(response: httpx.Response) -> bool:
    if response.status_code != 400:
        return False
    text = response.text.lower()
    return "temperature" in text and "deprecated" in text


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
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise LLMRequestError(
                    format_llm_http_error(exc),
                    status_code=exc.response.status_code,
                ) from exc
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
            raw_params = fn.get("parameters") or {"type": "object", "properties": {}}
            out.append(
                {
                    "name": fn.get("name", ""),
                    "description": fn.get("description", ""),
                    "input_schema": normalize_anthropic_input_schema(raw_params),
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
        anthropic_tools = self._openai_tools_to_anthropic(tools) if tools else None
        payload = build_anthropic_messages_payload(
            messages,
            model=self.cfg.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            tools=anthropic_tools,
            system=system,
            anthropic_messages=anthropic_messages,
        )

        url = f"{self.cfg.base_url.rstrip('/')}/v1/messages"
        async with httpx.AsyncClient(timeout=self.cfg.timeout_seconds) as client:
            resp = await client.post(url, headers=self._anthropic_headers(), json=payload)
            if anthropic_temperature_deprecated_response(resp):
                payload.pop("temperature", None)
                resp = await client.post(url, headers=self._anthropic_headers(), json=payload)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise LLMRequestError(
                    format_llm_http_error(exc),
                    status_code=exc.response.status_code,
                ) from exc
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
