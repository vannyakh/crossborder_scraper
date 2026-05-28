"""Panel guide catalog — metadata; body lives in libs/guides/{id}.md."""

from __future__ import annotations

from typing import Any, Literal

GuideCategory = Literal["agent", "scrape", "panel", "integrate"]

GUIDE_CATALOG: dict[str, dict[str, Any]] = {
    "agent-llm": {
        "title": "Gateway agent LLM",
        "summary": "Connect a provider and model for Agent chat, cron tasks, and Telegram.",
        "category": "agent",
        "tool_ids": ["settings"],
        "links": [
            {"label": "Agent LLM settings", "path": "/settings/ai"},
            {"label": "Agent chat", "path": "/agent/chat"},
            {"label": "Health probe", "path": "/health"},
        ],
    },
    "gateway-agent": {
        "title": "Gateway agent",
        "summary": (
            "Chat with tool-using automation: scrape, export, batch submit, and runtime checks."
        ),
        "category": "agent",
        "tool_ids": ["agent", "skills", "workflows"],
        "links": [
            {"label": "Agent chat", "path": "/agent/chat"},
            {"label": "Cron schedules", "path": "/agent/schedules"},
            {"label": "Tool catalog", "path": "/debug/tools"},
        ],
    },
    "agent-tools": {
        "title": "Gateway tool catalog",
        "summary": "Tools the agent can call — schemas, required fields, and categories.",
        "category": "agent",
        "tool_ids": ["tool-catalog"],
        "links": [{"label": "Tool catalog", "path": "/debug/tools"}],
    },
    "scrape-workflow": {
        "title": "Scrape workflow",
        "summary": "Submit URLs, monitor batches, and browse the product catalog.",
        "category": "scrape",
        "tool_ids": ["batch-queue", "catalog", "files"],
        "links": [
            {"label": "Batch queue", "path": "/workflow/batches"},
            {"label": "Products", "path": "/artifact/products"},
        ],
    },
    "telegram": {
        "title": "Telegram bot",
        "summary": "Wire a control chat to the same gateway agent as the web panel.",
        "category": "integrate",
        "tool_ids": ["telegram"],
        "links": [{"label": "Telegram setup", "path": "/integrate/telegram"}],
    },
    "network-access": {
        "title": "Network and firewall",
        "summary": "Panel port, host firewall, and cloud security group checklist for VPS access.",
        "category": "panel",
        "tool_ids": ["network", "store"],
        "links": [
            {"label": "Network settings", "path": "/settings/network"},
            {"label": "Firewall", "path": "/firewall"},
        ],
    },
    "health-probes": {
        "title": "Health and readiness",
        "summary": "Engine status, agent LLM probe, and Support readiness checks.",
        "category": "panel",
        "tool_ids": ["health", "support", "guides"],
        "links": [
            {"label": "Health", "path": "/health"},
            {"label": "Guides", "path": "/guides"},
            {"label": "Support", "path": "/support"},
        ],
    },
}

CATEGORY_LABELS: dict[str, str] = {
    "agent": "Gateway agent",
    "scrape": "Scrape",
    "panel": "Panel",
    "integrate": "Integrate",
}


def list_guide_ids() -> list[str]:
    return list(GUIDE_CATALOG.keys())
