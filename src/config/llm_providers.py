"""LLM provider presets for panel + gateway agent configuration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlparse

ApiStyle = Literal["openai_compatible", "anthropic"]


@dataclass(frozen=True)
class LLMProviderPreset:
    id: str
    label: str
    base_url: str
    default_model: str
    api_style: ApiStyle
    requires_api_key: bool
    api_key_hint: str
    docs_url: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "base_url": self.base_url,
            "default_model": self.default_model,
            "api_style": self.api_style,
            "requires_api_key": self.requires_api_key,
            "api_key_hint": self.api_key_hint,
            "docs_url": self.docs_url,
        }


PROVIDER_PRESETS: dict[str, LLMProviderPreset] = {
    "openai": LLMProviderPreset(
        id="openai",
        label="OpenAI",
        base_url="https://api.openai.com/v1",
        default_model="gpt-4o-mini",
        api_style="openai_compatible",
        requires_api_key=True,
        api_key_hint="sk-…",
        docs_url="https://platform.openai.com/api-keys",
    ),
    "anthropic": LLMProviderPreset(
        id="anthropic",
        label="Anthropic Claude",
        base_url="https://api.anthropic.com",
        default_model="claude-3-5-haiku-20241022",
        api_style="anthropic",
        requires_api_key=True,
        api_key_hint="sk-ant-…",
        docs_url="https://console.anthropic.com/settings/keys",
    ),
    "google": LLMProviderPreset(
        id="google",
        label="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        default_model="gemini-2.0-flash",
        api_style="openai_compatible",
        requires_api_key=True,
        api_key_hint="AIza…",
        docs_url="https://aistudio.google.com/apikey",
    ),
    "ollama": LLMProviderPreset(
        id="ollama",
        label="Ollama (local)",
        base_url="http://127.0.0.1:11434/v1",
        default_model="llama3.2",
        api_style="openai_compatible",
        requires_api_key=False,
        api_key_hint="Optional — usually not required",
        docs_url="https://ollama.com",
    ),
    "qwen": LLMProviderPreset(
        id="qwen",
        label="Alibaba Qwen (DashScope)",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        default_model="qwen-plus",
        api_style="openai_compatible",
        requires_api_key=True,
        api_key_hint="sk-… (DashScope API key)",
        docs_url="https://dashscope.console.aliyun.com/",
    ),
    "custom": LLMProviderPreset(
        id="custom",
        label="Custom (OpenAI-compatible)",
        base_url="",
        default_model="",
        api_style="openai_compatible",
        requires_api_key=False,
        api_key_hint="Depends on your endpoint",
        docs_url="",
    ),
}

DEFAULT_PROVIDER_ID = "openai"


def format_model_ref(provider_id: str, model: str) -> str:
    """Canonical model ref: ``provider/model`` (e.g. ``openai/gpt-4o-mini``)."""
    pid = (provider_id or DEFAULT_PROVIDER_ID).strip().lower()
    mid = (model or "").strip()
    if not mid:
        return pid
    return f"{pid}/{mid}"


def parse_model_ref(ref: str) -> tuple[str, str]:
    """Split ``provider/model`` into provider id and model id."""
    text = (ref or "").strip()
    if "/" in text:
        provider_id, model = text.split("/", 1)
        return provider_id.strip().lower() or DEFAULT_PROVIDER_ID, model.strip()
    return DEFAULT_PROVIDER_ID, text


def list_providers() -> list[dict[str, Any]]:
    order = ("openai", "anthropic", "google", "ollama", "qwen", "custom")
    return [PROVIDER_PRESETS[pid].to_dict() for pid in order if pid in PROVIDER_PRESETS]


def get_provider(provider_id: str | None) -> LLMProviderPreset:
    pid = (provider_id or DEFAULT_PROVIDER_ID).strip().lower()
    return PROVIDER_PRESETS.get(pid, PROVIDER_PRESETS[DEFAULT_PROVIDER_ID])


def infer_provider_id(*, base_url: str, model: str = "") -> str:
    host = (urlparse(base_url).netloc or "").lower()
    url_l = base_url.lower()
    model_l = model.lower()

    if "anthropic.com" in host or "claude" in model_l:
        return "anthropic"
    if "generativelanguage.googleapis.com" in host or "gemini" in model_l:
        return "google"
    if "dashscope" in host or "qwen" in model_l:
        return "qwen"
    if "11434" in url_l or "ollama" in host:
        return "ollama"
    if "openai.com" in host or model_l.startswith("gpt-"):
        return "openai"
    if base_url.strip():
        return "custom"
    return DEFAULT_PROVIDER_ID


def apply_provider_defaults(
    provider_id: str,
    *,
    base_url: str | None = None,
    model: str | None = None,
) -> tuple[str, str]:
    """Return (base_url, model) filling blanks from the selected preset."""
    preset = get_provider(provider_id)
    resolved_url = (base_url or "").strip() or preset.base_url
    resolved_model = (model or "").strip() or preset.default_model
    return resolved_url, resolved_model
