"""Build plugin profile catalog for project flow nodes (LLM model, scraper, tools)."""

from __future__ import annotations

from typing import Any, Literal

from config.llm_providers import list_providers
from core.plugins.manager import get_plugin_manager
from server.schemas.plugin_profiles import PluginProfileCategory, PluginProfileFieldType

TabId = Literal["parameters", "source", "variables", "settings", "export", "output"]


def _field(
    field_id: str,
    *,
    key: str,
    label: str,
    field_type: PluginProfileFieldType,
    required: bool = False,
    default: Any = None,
    placeholder: str | None = None,
    hint: str | None = None,
    bind: str | None = None,
    resolve: str | None = None,
    rows: int | None = None,
    options: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": field_id,
        "key": key,
        "label": label,
        "type": field_type,
        "required": required,
    }
    if default is not None:
        row["default"] = default
    if placeholder:
        row["placeholder"] = placeholder
    if hint:
        row["hint"] = hint
    if bind:
        row["bind"] = bind
    if resolve:
        row["resolve"] = resolve
    if rows is not None:
        row["rows"] = rows
    if options:
        row["options"] = options
    return row


def _profile(
    profile_id: str,
    *,
    label: str,
    category: PluginProfileCategory,
    node_kinds: list[str],
    plugin_id: str | None = None,
    slot_index: int | None = None,
    parameters_layout: str | None = None,
    tabs: list[dict[str, str]],
    sections: list[dict[str, Any]],
    variable_keys: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": profile_id,
        "label": label,
        "category": category,
        "plugin_id": plugin_id,
        "node_kinds": node_kinds,
        "slot_index": slot_index,
        "tabs": tabs,
        "sections": sections,
        "variable_keys": variable_keys or [],
    }
    if parameters_layout:
        row["parameters_layout"] = parameters_layout
    return row


def _model_profile() -> dict[str, Any]:
    providers = list_providers()
    provider_options = [{"value": p["id"], "label": p["label"]} for p in providers]
    return _profile(
        "llm-model",
        label="Chat model",
        category="model",
        node_kinds=["agent"],
        slot_index=0,
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "variables", "label": "Variables"},
        ],
        sections=[
            {
                "id": "model",
                "label": "Chat model",
                "tab": "parameters",
                "fields": [
                    _field(
                        "provider",
                        key="llm_provider",
                        label="Provider",
                        field_type="llm_provider",
                        required=True,
                        default="openai",
                        options=provider_options,
                    ),
                    _field(
                        "model",
                        key="llm_model",
                        label="Model",
                        field_type="llm_model",
                        required=True,
                        default="gpt-4o-mini",
                        hint="Uses panel API keys from Settings → Agent LLM unless overridden.",
                    ),
                    _field(
                        "temperature",
                        key="temperature",
                        label="Temperature",
                        field_type="text",
                        default="0.7",
                        placeholder="0.0 – 1.0",
                    ),
                ],
            },
            {
                "id": "keys",
                "label": "API keys",
                "tab": "variables",
                "fields": [
                    _field(
                        "api_key_var",
                        key="api_key_variable",
                        label="API key variable",
                        field_type="variable_key",
                        placeholder="OPENAI_API_KEY",
                        hint="Optional project variable override for this node.",
                    ),
                ],
            },
        ],
        variable_keys=[
            {
                "key": "OPENAI_API_KEY",
                "label": "OpenAI API key",
                "scope": "project",
                "masked": True,
            },
            {
                "key": "ANTHROPIC_API_KEY",
                "label": "Anthropic API key",
                "scope": "project",
                "masked": True,
            },
            {
                "key": "DEEPSEEK_API_KEY",
                "label": "DeepSeek API key",
                "scope": "project",
                "masked": True,
            },
        ],
    )


def _memory_profile() -> dict[str, Any]:
    return _profile(
        "agent-memory",
        label="Memory store",
        category="memory",
        node_kinds=["postgres", "redis"],
        slot_index=1,
        tabs=[{"id": "parameters", "label": "Parameters"}],
        sections=[
            {
                "id": "memory",
                "label": "Memory",
                "tab": "parameters",
                "fields": [
                    _field(
                        "store",
                        key="memory_store",
                        label="Store type",
                        field_type="select",
                        default="postgres",
                        options=[
                            {"value": "postgres", "label": "Postgres"},
                            {"value": "redis", "label": "Redis"},
                        ],
                    ),
                    _field(
                        "session_key",
                        key="session_key",
                        label="Session key prefix",
                        field_type="mono",
                        default="agent:memory:",
                    ),
                ],
            },
        ],
    )


def _tool_profile() -> dict[str, Any]:
    return _profile(
        "agent-tool",
        label="Gateway tool",
        category="tool",
        node_kinds=["scrape", "export", "notify", "webhook"],
        slot_index=2,
        tabs=[{"id": "parameters", "label": "Parameters"}],
        sections=[
            {
                "id": "tools",
                "label": "Tool scope",
                "tab": "parameters",
                "fields": [
                    _field(
                        "tool_scope",
                        key="tool_scope",
                        label="Tool scope",
                        field_type="select",
                        default="workflow",
                        options=[
                            {"value": "workflow", "label": "Workflow tools"},
                            {"value": "scrape", "label": "Scrape tools"},
                            {"value": "panel", "label": "Panel ops"},
                        ],
                    ),
                ],
            },
        ],
    )


def _scraper_base_profile() -> dict[str, Any]:
    mgr = get_plugin_manager()
    plugins = [
        {"value": str(row.get("id") or ""), "label": str(row.get("name") or row.get("id") or "")}
        for row in mgr.list_source_catalog()
        if row.get("scrape_spec") and row.get("id")
    ]
    return _profile(
        "scraper-source",
        label="Scrape source",
        category="scraper",
        node_kinds=["scrape"],
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "source", "label": "Source"},
            {"id": "variables", "label": "Variables"},
        ],
        sections=[
            {
                "id": "scrape",
                "label": "Scrape",
                "tab": "parameters",
                "fields": [
                    _field(
                        "plugin",
                        key="plugin_id",
                        label="Source plugin",
                        field_type="source_plugin",
                        required=True,
                        options=plugins,
                    ),
                    _field(
                        "url",
                        key="source_url",
                        label="Product URL",
                        field_type="url",
                        placeholder="https://…",
                    ),
                    _field(
                        "batch",
                        key="batch_mode",
                        label="Batch mode",
                        field_type="toggle",
                        default=False,
                    ),
                    _field(
                        "ai_extract",
                        key="ai_extraction",
                        label="AI extraction",
                        field_type="toggle",
                        default=True,
                        hint="Use the wired chat model for structured field extraction.",
                    ),
                ],
            },
            {
                "id": "fields",
                "label": "Data fields",
                "tab": "source",
                "fields": [
                    _field(
                        "data_fields",
                        key="data_fields",
                        label="Fields to collect",
                        field_type="textarea",
                        placeholder="title, price, images, variants",
                        hint="Comma-separated ScrapedProduct fields from the plugin manifest.",
                    ),
                ],
            },
            {
                "id": "proxy",
                "label": "Egress",
                "tab": "variables",
                "fields": [
                    _field(
                        "proxy_var",
                        key="proxy_variable",
                        label="Proxy pool variable",
                        field_type="variable_key",
                        placeholder="SCRAPE_PROXY_URL",
                    ),
                ],
            },
        ],
        variable_keys=[
            {
                "key": "SCRAPE_PROXY_URL",
                "label": "Scrape proxy URL",
                "scope": "shared",
                "masked": False,
            },
            {
                "key": "MARKETPLACE_COOKIE",
                "label": "Marketplace session cookie",
                "scope": "project",
                "masked": True,
            },
        ],
    )


def _scraper_plugin_profile(row: dict[str, Any]) -> dict[str, Any]:
    plugin_id = str(row.get("id") or "")
    name = str(row.get("name") or plugin_id)
    scrape_spec = row.get("scrape_spec") or {}
    data_fields = scrape_spec.get("data_fields") or []
    default_fields = ", ".join(str(f) for f in data_fields[:8])
    caps = scrape_spec.get("capabilities") or {}
    flow_node = row.get("flow_node") or {}
    flow_defaults = flow_node.get("default_options") or {}

    base = _scraper_base_profile()
    sections = []
    for section in base["sections"]:
        fields = []
        for field in section["fields"]:
            copied = dict(field)
            if copied["key"] == "plugin_id":
                copied["default"] = plugin_id
            if copied["key"] == "data_fields":
                copied["default"] = flow_defaults.get("data_fields") or default_fields
            if copied["key"] == "ai_extraction":
                copied["default"] = flow_defaults.get(
                    "ai_extraction",
                    bool(caps.get("supports_ai_extraction", True)),
                )
            if copied["key"] == "batch_mode":
                copied["default"] = flow_defaults.get(
                    "batch_mode",
                    bool(caps.get("supports_batch", False)),
                )
            fields.append(copied)
        sections.append({**section, "fields": fields})

    profile_id = str(flow_node.get("profile_id") or f"scraper-{plugin_id}")
    return _profile(
        profile_id,
        label=f"{name} scraper",
        category="scraper",
        node_kinds=[str(flow_node.get("node_kind") or "scrape")],
        plugin_id=plugin_id,
        tabs=base["tabs"],
        sections=sections,
        variable_keys=base["variable_keys"],
    )


def _schedule_profile() -> dict[str, Any]:
    return _profile(
        "flow-schedule",
        label="Schedule trigger",
        category="service",
        node_kinds=["schedule"],
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "settings", "label": "Settings"},
        ],
        sections=[
            {
                "id": "trigger",
                "label": "Trigger",
                "tab": "parameters",
                "fields": [
                    _field(
                        "cron",
                        key="cron",
                        label="Cron expression",
                        field_type="mono",
                        bind="subtitle",
                        placeholder="0 9 * * *",
                    ),
                    _field(
                        "name",
                        key="name",
                        label="Name",
                        field_type="text",
                        bind="label",
                    ),
                ],
            },
        ],
    )


def _webhook_profile() -> dict[str, Any]:
    return _profile(
        "flow-webhook",
        label="Webhook trigger",
        category="service",
        node_kinds=["webhook"],
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "settings", "label": "Settings"},
        ],
        sections=[
            {
                "id": "trigger",
                "label": "Trigger",
                "tab": "parameters",
                "fields": [
                    _field(
                        "event",
                        key="event",
                        label="Event",
                        field_type="mono",
                        bind="subtitle",
                    ),
                    _field(
                        "path",
                        key="webhook_path",
                        label="Webhook path",
                        field_type="mono",
                        bind="host",
                        placeholder="/hooks/inbound",
                    ),
                    _field(
                        "active",
                        key="webhookActive",
                        label="Active",
                        field_type="toggle",
                        default=True,
                    ),
                ],
            },
        ],
    )


def _export_profile() -> dict[str, Any]:
    return _profile(
        "flow-export",
        label="Marketplace export",
        category="service",
        node_kinds=["export"],
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "export", "label": "Export"},
        ],
        sections=[
            {
                "id": "export",
                "label": "Export",
                "tab": "export",
                "fields": [
                    _field(
                        "target",
                        key="exportTarget",
                        label="Export target",
                        field_type="select",
                        default="shopee",
                        options=[
                            {"value": "shopee", "label": "Shopee"},
                            {"value": "lazada", "label": "Lazada"},
                            {"value": "both", "label": "Shopee + Lazada"},
                        ],
                    ),
                    _field(
                        "host",
                        key="host",
                        label="Host",
                        field_type="mono",
                        bind="host",
                    ),
                ],
            },
        ],
    )


def _agent_profile() -> dict[str, Any]:
    return _profile(
        "flow-agent",
        label="Gateway agent",
        category="service",
        node_kinds=["agent"],
        parameters_layout="agent-slots",
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "settings", "label": "Settings"},
        ],
        sections=[
            {
                "id": "prompt",
                "label": "Agent prompt",
                "tab": "parameters",
                "fields": [
                    _field(
                        "agentPrompt",
                        key="agentPrompt",
                        label="System prompt",
                        field_type="textarea",
                        bind="agentPrompt",
                        rows=8,
                        placeholder="You are the Cross-Border gateway agent for this workflow…",
                        hint="Injected when this agent node runs in the flow.",
                    ),
                ],
            },
            {
                "id": "agent-settings",
                "label": "Overview",
                "tab": "settings",
                "fields": [
                    _field(
                        "name",
                        key="name",
                        label="Name",
                        field_type="text",
                        bind="label",
                    ),
                    _field(
                        "skill",
                        key="skill",
                        label="Agent type",
                        field_type="mono",
                        resolve="subtitle",
                    ),
                    _field(
                        "runtime",
                        key="runtime",
                        label="Tool scope",
                        field_type="mono",
                        resolve="host",
                    ),
                ],
            },
        ],
    )


def _notify_profile() -> dict[str, Any]:
    return _profile(
        "flow-notify",
        label="Integrate notify",
        category="service",
        node_kinds=["notify"],
        tabs=[
            {"id": "parameters", "label": "Parameters"},
            {"id": "settings", "label": "Settings"},
        ],
        sections=[
            {
                "id": "trigger",
                "label": "Trigger",
                "tab": "parameters",
                "fields": [
                    _field(
                        "channel",
                        key="integrateChannel",
                        label="Integrate channel",
                        field_type="select",
                        default="telegram",
                        options=[
                            {"value": "telegram", "label": "Telegram"},
                            {"value": "discord", "label": "Discord"},
                            {"value": "email", "label": "Email"},
                        ],
                    ),
                    _field(
                        "host",
                        key="host",
                        label="Host",
                        field_type="mono",
                        bind="host",
                    ),
                ],
            },
        ],
    )


def _condition_profile() -> dict[str, Any]:
    return _profile(
        "flow-condition",
        label="Condition",
        category="service",
        node_kinds=["condition"],
        tabs=[{"id": "parameters", "label": "Parameters"}],
        sections=[
            {
                "id": "overview",
                "label": "Overview",
                "tab": "parameters",
                "fields": [
                    _field(
                        "expr",
                        key="condition",
                        label="Condition expression",
                        field_type="textarea",
                        bind="subtitle",
                        rows=4,
                        placeholder="items.length > 0",
                    ),
                    _field(
                        "status",
                        key="status",
                        label="Service status",
                        field_type="text",
                        resolve="status",
                    ),
                ],
            },
        ],
    )


def build_plugin_profile_catalog() -> dict[str, Any]:
    """Return all built-in and manifest-derived plugin profiles."""
    profiles: list[dict[str, Any]] = [
        _model_profile(),
        _memory_profile(),
        _tool_profile(),
        _scraper_base_profile(),
        _schedule_profile(),
        _webhook_profile(),
        _export_profile(),
        _agent_profile(),
        _notify_profile(),
        _condition_profile(),
    ]

    mgr = get_plugin_manager()
    seen: set[str] = set()
    for row in mgr.list_source_catalog():
        plugin_id = str(row.get("id") or "")
        if not plugin_id or plugin_id in seen or not row.get("scrape_spec"):
            continue
        seen.add(plugin_id)
        profiles.append(_scraper_plugin_profile(row))

    return {
        "profiles": profiles,
        "total": len(profiles),
    }
