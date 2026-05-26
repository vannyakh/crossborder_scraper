"""Gateway tool registry — agent-callable actions (OpenClaw-style tools, n8n-style nodes)."""

from __future__ import annotations

import json
from typing import Any, Awaitable, Callable

from loguru import logger

ToolHandler = Callable[..., Awaitable[dict[str, Any]]]

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "scrape_product",
        "description": "Scrape a product URL from 1688, Taobao, or AliExpress.",
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
        "description": "Export a saved product to a marketplace (shopee, lazada, tiktok_shop, shopify).",
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
    return {
        "status": result.status.value,
        "product_id": product_id,
        "title": product.title if product else None,
        "url": url,
        "ai_used": result.ai_used,
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
    from config.ui_store import load_marketplaces_config
    from export.registry import EXPORTERS, get_exporter

    configured = load_marketplaces_config()
    items = []
    for key in EXPORTERS:
        exporter = get_exporter(key)  # type: ignore[arg-type]
        entry = configured.get(key, {})
        items.append(
            {
                "id": key,
                "label": entry.get("label") or key,
                "configured": exporter.validate_credentials(),
                "supports_export": True,
            }
        )
    for platform_id, entry in configured.items():
        if platform_id in EXPORTERS:
            continue
        creds = entry.get("credentials") or {}
        items.append(
            {
                "id": platform_id,
                "label": entry.get("label") or platform_id,
                "configured": bool(entry.get("enabled") and any(creds.values())),
                "supports_export": False,
            }
        )
    return {"items": items}


async def _submit_batch(
    manager: Any,
    *,
    urls: list[str],
    workers: int | None = None,
    use_ai: bool | None = None,
) -> dict[str, Any]:
    batch_id = await manager.submit_batch(urls, workers=workers, use_ai=use_ai, save=True)
    return {"batch_id": batch_id, "total": len(urls)}


async def _runtime_status(manager: Any) -> dict[str, Any]:
    from datetime import datetime

    return manager.get_runtime_status(started_at=datetime.utcnow())


def tools_for_llm() -> list[dict[str, Any]]:
    """OpenAI-compatible tool schemas for chat/completions."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in TOOL_DEFINITIONS
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
