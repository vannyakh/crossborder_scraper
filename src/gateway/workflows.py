"""Workflow templates — declarative multi-step pipelines (gateway tools)."""

from __future__ import annotations

from typing import Any

WORKFLOW_TEMPLATES: dict[str, dict[str, Any]] = {
    "scrape_to_export": {
        "label": "Scrape → Export",
        "description": "Scrape a product URL, then prepare marketplace listing export.",
        "steps": [
            {"tool": "scrape_product", "args": {"url": "{url}", "save": True}},
            {
                "tool": "export_listing",
                "args": {
                    "product_id": "{product_id}",
                    "marketplace": "{marketplace}",
                    "dry_run": True,
                },
            },
        ],
        "inputs": ["url", "marketplace"],
    },
    "batch_scrape": {
        "label": "Batch scrape",
        "description": "Submit multiple URLs for concurrent scraping.",
        "steps": [
            {"tool": "submit_batch", "args": {"urls": "{urls}", "use_ai": "{use_ai}"}},
        ],
        "inputs": ["urls"],
    },
    "catalog_snapshot": {
        "label": "Catalog snapshot",
        "description": "List products and marketplace readiness.",
        "steps": [
            {"tool": "list_products", "args": {"limit": 20}},
            {"tool": "list_marketplaces", "args": {}},
        ],
        "inputs": [],
    },
}


def _resolve(value: Any, context: dict[str, Any]) -> Any:
    if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
        key = value[1:-1]
        return context.get(key, value)
    if isinstance(value, dict):
        return {k: _resolve(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve(v, context) for v in value]
    return value


async def run_workflow(
    workflow_id: str,
    *,
    inputs: dict[str, Any],
    manager: Any,
) -> dict[str, Any]:
    from gateway.tools import execute_tool

    template = WORKFLOW_TEMPLATES.get(workflow_id)
    if not template:
        raise ValueError(f"unknown workflow: {workflow_id}")

    context = dict(inputs)
    step_results: list[dict[str, Any]] = []

    for step in template["steps"]:
        tool = step["tool"]
        args = _resolve(step.get("args") or {}, context)
        outcome = await execute_tool(tool, args, manager=manager)
        step_results.append(outcome)
        if not outcome.get("ok"):
            return {
                "workflow": workflow_id,
                "status": "failed",
                "steps": step_results,
                "context": context,
            }
        result = outcome.get("result") or {}
        if tool == "scrape_product":
            if result.get("product_id"):
                context["product_id"] = result["product_id"]
            if result.get("phases"):
                context["last_scrape_phases"] = result["phases"]
            if result.get("pipeline"):
                context["last_pipeline"] = result["pipeline"]

    return {
        "workflow": workflow_id,
        "status": "completed",
        "steps": step_results,
        "context": context,
    }
