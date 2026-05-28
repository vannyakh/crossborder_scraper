"""Gateway tool registry — agent-callable actions."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

from loguru import logger

ToolHandler = Callable[..., Awaitable[dict[str, Any]]]

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "scrape_product",
        "description": "Scrape a URL from 1688, Taobao, AliExpress, or enabled source plugins.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Product page URL"},
                "use_ai": {"type": "boolean", "description": "Force AI extraction"},
                "save": {"type": "boolean", "description": "Persist to database"},
            },
            "required": ["url"],
        },
    },
    {
        "name": "export_listing",
        "description": (
            "Export a saved product to a marketplace (shopee, lazada, tiktok_shop, shopify)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer"},
                "marketplace": {"type": "string"},
                "dry_run": {"type": "boolean"},
            },
            "required": ["product_id", "marketplace"],
        },
    },
    {
        "name": "list_products",
        "description": "List recently scraped products in the database.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max rows (default 10)"},
            },
        },
    },
    {
        "name": "list_marketplaces",
        "description": "List configured marketplace integrations and export support.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "submit_batch",
        "description": "Submit multiple URLs for concurrent scraping.",
        "parameters": {
            "type": "object",
            "properties": {
                "urls": {"type": "array", "items": {"type": "string"}},
                "workers": {"type": "integer"},
                "use_ai": {"type": "boolean"},
            },
            "required": ["urls"],
        },
    },
    {
        "name": "runtime_status",
        "description": "Get gateway service health, engine limits, and running batches.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "network_access_status",
        "description": (
            "Panel TCP bind, host firewall (ufw/firewalld), and cloud security group checklist."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "port": {"type": "integer", "description": "Panel port (default from settings)"},
            },
        },
    },
    {
        "name": "apply_panel_firewall",
        "description": "Open the panel TCP port in ufw/firewalld on this VPS (needs root or sudo).",
        "parameters": {
            "type": "object",
            "properties": {
                "port": {"type": "integer"},
                "enable_ufw": {
                    "type": "boolean",
                    "description": "Enable ufw with SSH + panel port if inactive",
                },
            },
        },
    },
    {
        "name": "setup_network_access",
        "description": (
            "Full VPS access setup: bind 0.0.0.0, host firewall, detect public IP in .env."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "port": {"type": "integer"},
                "enable_ufw": {"type": "boolean"},
            },
        },
    },
    {
        "name": "list_agent_rules",
        "description": (
            "List gateway agent behavior rules (RULE.md) with enabled state. "
            "Rules are injected into the agent system prompt when enabled."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "list_firewall_rules",
        "description": "List host UFW port rules, groups, and firewall status for VPS security.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "list_integrate_channels",
        "description": (
            "List integrate messaging channels (Telegram, Discord, Slack, Email) "
            "with configured/enabled/runtime status."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "configure_integrate_channel",
        "description": (
            "Update credentials or options for an integrate channel. "
            "Use channel_id telegram, discord, slack, or email."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "channel_id": {
                    "type": "string",
                    "enum": ["telegram", "discord", "slack", "email"],
                },
                "updates": {
                    "type": "object",
                    "description": (
                        "Channel fields to merge (enabled, bot_token, control_chat_ids, …)"
                    ),
                },
            },
            "required": ["channel_id", "updates"],
        },
    },
    {
        "name": "reload_integrate_channel",
        "description": "Restart the live runner for an integrate channel (Telegram when enabled).",
        "parameters": {
            "type": "object",
            "properties": {
                "channel_id": {
                    "type": "string",
                    "enum": ["telegram", "discord", "slack", "email"],
                },
            },
            "required": ["channel_id"],
        },
    },
    {
        "name": "list_schedules",
        "description": (
            "List gateway agent cron schedules (name, cron, enabled, last run). "
            "Use before create/update to avoid duplicates."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "create_schedule",
        "description": (
            "Create a cron schedule that runs the gateway agent on a timer. "
            "Use */1 * * * * only for lightweight health pings — not scraping. "
            "Set notify_telegram=true to push the summary to allowed Telegram chats."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Short label for the job"},
                "cron": {
                    "type": "string",
                    "description": "Standard 5-field cron (minute hour dom month dow)",
                },
                "message": {
                    "type": "string",
                    "description": "Agent instruction executed each tick",
                },
                "enabled": {"type": "boolean", "description": "Start enabled (default true)"},
                "prompt_id": {
                    "type": "string",
                    "description": "Role prompt id (default gateway_agent)",
                },
                "notify_telegram": {
                    "type": "boolean",
                    "description": "Push run summary to Telegram control chats",
                },
            },
            "required": ["name", "cron", "message"],
        },
    },
    {
        "name": "update_schedule",
        "description": "Update an existing cron schedule by id or name.",
        "parameters": {
            "type": "object",
            "properties": {
                "schedule_id": {"type": "string"},
                "name": {"type": "string", "description": "Match by name if id omitted"},
                "new_name": {"type": "string"},
                "cron": {"type": "string"},
                "message": {"type": "string"},
                "enabled": {"type": "boolean"},
                "prompt_id": {"type": "string"},
                "notify_telegram": {"type": "boolean"},
            },
        },
    },
    {
        "name": "delete_schedule",
        "description": "Delete a cron schedule by id or name.",
        "parameters": {
            "type": "object",
            "properties": {
                "schedule_id": {"type": "string"},
                "name": {"type": "string", "description": "Match by name if id omitted"},
            },
        },
    },
    {
        "name": "run_schedule",
        "description": "Run a cron schedule immediately (manual trigger, same as panel Run now).",
        "parameters": {
            "type": "object",
            "properties": {
                "schedule_id": {"type": "string"},
                "name": {"type": "string", "description": "Match by name if id omitted"},
            },
        },
    },
]


async def execute_tool(name: str, arguments: dict[str, Any], *, manager: Any) -> dict[str, Any]:
    """Dispatch a registered tool through the scrape manager."""
    handlers: dict[str, ToolHandler] = {
        "scrape_product": _scrape_product,
        "export_listing": _export_listing,
        "list_products": _list_products,
        "list_marketplaces": _list_marketplaces,
        "submit_batch": _submit_batch,
        "runtime_status": _runtime_status,
        "network_access_status": _network_access_status,
        "apply_panel_firewall": _apply_panel_firewall,
        "setup_network_access": _setup_network_access,
        "list_agent_rules": _list_agent_rules,
        "list_firewall_rules": _list_firewall_rules,
        "list_integrate_channels": _list_integrate_channels,
        "configure_integrate_channel": _configure_integrate_channel,
        "reload_integrate_channel": _reload_integrate_channel,
        "list_schedules": _list_schedules,
        "create_schedule": _create_schedule,
        "update_schedule": _update_schedule,
        "delete_schedule": _delete_schedule,
        "run_schedule": _run_schedule,
    }
    handler = handlers.get(name)
    if not handler:
        return {"ok": False, "error": f"unknown tool: {name}"}
    try:
        result = await handler(manager, **arguments)
        return {"ok": True, "tool": name, "result": result}
    except Exception as exc:
        logger.warning("Tool {} failed: {}", name, exc)
        return {"ok": False, "tool": name, "error": str(exc)}


async def _scrape_product(
    manager: Any,
    *,
    url: str,
    use_ai: bool | None = None,
    save: bool = True,
) -> dict[str, Any]:
    result, product_id = await manager.scrape_single(url, use_ai=use_ai, save=save)
    product = result.product
    agent_meta = {}
    if product and product.attributes:
        agent_meta = product.attributes.get("ai_agent") or {}
    return {
        "status": result.status.value,
        "product_id": product_id,
        "title": product.title if product else None,
        "url": url,
        "site_key": result.site_key,
        "ai_used": result.ai_used,
        "ai_extract_used": result.ai_extract_used,
        "agent_used": result.agent_used,
        "agent_valid": agent_meta.get("valid"),
        "phases": result.phases,
        "pipeline": [p.get("phase") for p in result.phases],
        "error": result.error,
    }


async def _export_listing(
    manager: Any,
    *,
    product_id: int,
    marketplace: str,
    dry_run: bool = True,
) -> dict[str, Any]:
    return await manager.export_product(
        product_id=product_id,
        url=None,
        marketplace=marketplace,
        dry_run=dry_run,
    )


async def _list_products(manager: Any, *, limit: int = 10) -> dict[str, Any]:
    rows = manager.store.list_products(limit=limit, offset=0)
    return {
        "total": manager.store.count_products(),
        "items": [
            {
                "id": r["id"],
                "title": r["title"],
                "source": r["source"],
                "source_url": r["source_url"],
            }
            for r in rows
        ],
    }


async def _list_marketplaces(manager: Any) -> dict[str, Any]:
    from server.services.marketplace import list_marketplace_items

    return {"items": list_marketplace_items()}


async def _submit_batch(
    manager: Any,
    *,
    urls: list[str],
    workers: int | None = None,
    use_ai: bool | None = None,
) -> dict[str, Any]:
    batch_id = await manager.submit_batch(urls, workers=workers, use_ai=use_ai, save=True)
    return {"batch_id": batch_id, "total": len(urls)}


async def _runtime_status(_manager: Any) -> dict[str, Any]:
    from server.services.runtime import get_service_runtime

    return get_service_runtime()


async def _network_access_status(_manager: Any, *, port: int | None = None) -> dict[str, Any]:
    from server.services.network_access import get_network_access_service

    return get_network_access_service().get_status(port=port)


async def _apply_panel_firewall(
    _manager: Any,
    *,
    port: int | None = None,
    enable_ufw: bool = False,
) -> dict[str, Any]:
    from server.services.network_access import get_network_access_service

    return get_network_access_service().apply_host_firewall(
        port=port,
        enable_ufw=enable_ufw,
        username="gateway-agent",
    )


async def _setup_network_access(
    _manager: Any,
    *,
    port: int | None = None,
    enable_ufw: bool = True,
) -> dict[str, Any]:
    from server.services.network_access import get_network_access_service

    return get_network_access_service().run_full_setup(
        port=port,
        enable_ufw=enable_ufw,
        username="gateway-agent",
    )


async def _list_agent_rules(_manager: Any) -> dict[str, Any]:
    from gateway.rules import get_rule_manager

    mgr = get_rule_manager()
    return {
        "items": mgr.list_catalog(),
        "total": len(mgr.all_manifests()),
        "enabled": sorted(mgr.enabled_ids()),
    }


async def _list_firewall_rules(_manager: Any) -> dict[str, Any]:
    from server.services.firewall_service import get_firewall_service

    svc = get_firewall_service()
    return {
        "status": svc.get_status(),
        "rules": svc.list_rules(),
        "groups": svc.list_groups(),
    }


async def _list_integrate_channels(_manager: Any) -> dict[str, Any]:
    from gateway.integrate.setup import channel_status

    return channel_status()


async def _configure_integrate_channel(
    _manager: Any,
    *,
    channel_id: str,
    updates: dict[str, Any],
) -> dict[str, Any]:
    from gateway.integrate.setup import configure_channel

    detail = configure_channel(channel_id.strip(), updates or {})
    if channel_id.strip() == "telegram":
        from gateway.integrate.lifecycle import reload_channel

        await reload_channel("telegram")
    return detail


async def _reload_integrate_channel(_manager: Any, *, channel_id: str) -> dict[str, Any]:
    from gateway.integrate.lifecycle import reload_channel

    return await reload_channel(channel_id.strip())


def _resolve_schedule_id(*, schedule_id: str | None = None, name: str | None = None) -> str:
    from gateway.schedules_store import load_schedules

    sid = (schedule_id or "").strip()
    if sid:
        return sid
    needle = (name or "").strip().casefold()
    if not needle:
        raise ValueError("schedule_id or name is required")
    for row in load_schedules():
        if str(row.get("name") or "").strip().casefold() == needle:
            found = str(row.get("id") or "").strip()
            if found:
                return found
    raise LookupError(f"schedule not found: {name or schedule_id}")


async def _list_schedules(_manager: Any) -> dict[str, Any]:
    from gateway.scheduler import get_scheduler
    from gateway.schedules_store import load_schedules

    schedules = load_schedules()
    status = get_scheduler().get_status()
    return {
        "items": schedules,
        "total": len(schedules),
        "enabled": sum(1 for s in schedules if s.get("enabled", True)),
        "scheduler_active": status.get("active"),
    }


async def _create_schedule(
    _manager: Any,
    *,
    name: str,
    cron: str,
    message: str,
    enabled: bool = True,
    prompt_id: str = "gateway_agent",
    notify_telegram: bool = False,
) -> dict[str, Any]:
    from server.services.gateway_service import get_gateway_service

    payload = {
        "name": name.strip(),
        "cron": cron.strip(),
        "message": message.strip(),
        "enabled": enabled,
        "prompt_id": prompt_id.strip() or "gateway_agent",
        "notify_telegram": notify_telegram,
    }
    record = get_gateway_service().create_schedule(payload)
    return {"schedule": record}


async def _update_schedule(
    _manager: Any,
    *,
    schedule_id: str | None = None,
    name: str | None = None,
    new_name: str | None = None,
    cron: str | None = None,
    message: str | None = None,
    enabled: bool | None = None,
    prompt_id: str | None = None,
    notify_telegram: bool | None = None,
) -> dict[str, Any]:
    from server.services.gateway_service import get_gateway_service

    sid = _resolve_schedule_id(schedule_id=schedule_id, name=name)
    patch: dict[str, Any] = {}
    if new_name is not None:
        patch["name"] = new_name.strip()
    if cron is not None:
        patch["cron"] = cron.strip()
    if message is not None:
        patch["message"] = message.strip()
    if enabled is not None:
        patch["enabled"] = enabled
    if prompt_id is not None:
        patch["prompt_id"] = prompt_id.strip()
    if notify_telegram is not None:
        patch["notify_telegram"] = notify_telegram
    if not patch:
        raise ValueError("No fields to update")
    record = get_gateway_service().update_schedule(sid, patch)
    return {"schedule": record}


async def _delete_schedule(
    _manager: Any,
    *,
    schedule_id: str | None = None,
    name: str | None = None,
) -> dict[str, Any]:
    from server.services.gateway_service import get_gateway_service

    sid = _resolve_schedule_id(schedule_id=schedule_id, name=name)
    deleted = get_gateway_service().delete_schedule(sid)
    if not deleted:
        raise LookupError("schedule not found")
    return {"deleted": True, "schedule_id": sid}


async def _run_schedule(
    _manager: Any,
    *,
    schedule_id: str | None = None,
    name: str | None = None,
) -> dict[str, Any]:
    from server.services.gateway_service import get_gateway_service

    sid = _resolve_schedule_id(schedule_id=schedule_id, name=name)
    result = await get_gateway_service().run_schedule_now(sid)
    return {"schedule_id": sid, **result}


def tools_for_llm(*, allow_names: set[str] | None = None) -> list[dict[str, Any]]:
    """OpenAI-compatible tool schemas for chat/completions."""
    defs = TOOL_DEFINITIONS
    if allow_names:
        defs = [t for t in defs if t["name"] in allow_names]
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in defs
    ]


def parse_tool_call(raw: Any) -> tuple[str, dict[str, Any]] | None:
    if not isinstance(raw, dict):
        return None
    name = raw.get("name") or raw.get("function", {}).get("name")
    args = raw.get("arguments") or raw.get("function", {}).get("arguments") or {}
    if isinstance(args, str):
        args = json.loads(args)
    if not name:
        return None
    return str(name), dict(args)
