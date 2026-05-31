"""Project settings — compose persisted config with flow-derived data."""

from __future__ import annotations

from typing import Any

from server.projects.settings_store import (
    create_project_token,
    load_project_settings,
    patch_project_settings,
    revoke_project_token,
)


def _infer_variables(project: dict[str, Any], stored: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key = {str(row.get("key") or ""): dict(row) for row in stored if row.get("key")}
    if "CROSSBORDER_WWWROOT" not in by_key:
        by_key["CROSSBORDER_WWWROOT"] = {
            "key": "CROSSBORDER_WWWROOT",
            "scope": "shared",
            "masked": False,
            "value": "",
        }

    nodes = project.get("nodes") or []
    for node in nodes:
        kind = str(node.get("kind") or "")
        if kind == "postgres" and "DATABASE_URL" not in by_key:
            by_key["DATABASE_URL"] = {
                "key": "DATABASE_URL",
                "scope": "project",
                "masked": True,
                "value": "",
            }
        if kind == "redis" and "REDIS_URL" not in by_key:
            by_key["REDIS_URL"] = {
                "key": "REDIS_URL",
                "scope": "project",
                "masked": True,
                "value": "",
            }
        if kind == "webhook" and "WEBHOOK_SECRET" not in by_key:
            by_key["WEBHOOK_SECRET"] = {
                "key": "WEBHOOK_SECRET",
                "scope": "project",
                "masked": True,
                "value": "",
            }
            subtitle = str(node.get("subtitle") or "").lower()
            if "telegram" in subtitle and "TELEGRAM_BOT_TOKEN" not in by_key:
                by_key["TELEGRAM_BOT_TOKEN"] = {
                    "key": "TELEGRAM_BOT_TOKEN",
                    "scope": "project",
                    "masked": True,
                    "value": "",
                }

    return list(by_key.values())


def _flow_webhooks(project: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for node in project.get("nodes") or []:
        kind = str(node.get("kind") or "")
        if kind not in ("webhook", "schedule"):
            continue
        rows.append(
            {
                "node_id": str(node.get("id") or ""),
                "label": str(node.get("label") or kind),
                "subtitle": node.get("subtitle"),
                "kind": kind,
                "status": node.get("status") or "online",
            }
        )
    return rows


def _integrate_channels() -> list[dict[str, Any]]:
    try:
        from gateway.integrate.store import list_channel_summaries

        return [
            {
                "id": row["id"],
                "label": row.get("label") or row["id"],
                "linked": bool(row.get("configured") and row.get("enabled")),
                "configured": bool(row.get("configured")),
                "runtime_active": bool(row.get("runtime_active")),
            }
            for row in list_channel_summaries()
        ]
    except Exception:
        return []


def build_project_settings(project: dict[str, Any]) -> dict[str, Any]:
    project_id = str(project.get("id") or "")
    stored = load_project_settings(project_id)
    variables = _infer_variables(project, list(stored.get("variables") or []))

    tokens = [
        {
            "id": str(row.get("id") or ""),
            "label": str(row.get("label") or "Token"),
            "prefix": str(row.get("prefix") or ""),
            "created_at": str(row.get("created_at") or ""),
        }
        for row in stored.get("tokens") or []
    ]

    return {
        "project_id": project_id,
        "general": {
            "name": str(project.get("name") or project_id),
            "description": project.get("description") or "",
            "environment": project.get("environment") or "development",
            "visibility": stored.get("visibility") or "private",
        },
        "usage": {
            "services_online": int(project.get("services_online") or 0),
            "services_total": int(project.get("services_total") or 0),
            "nodes": len(project.get("nodes") or []),
            "environment": project.get("environment") or "development",
            "flow_revision": int(project.get("flow_revision") or 0),
            "updated_at": str(project.get("updated_at") or ""),
        },
        "variables": variables,
        "webhooks": _flow_webhooks(project),
        "members": list(stored.get("members") or []),
        "tokens": tokens,
        "integrations": _integrate_channels(),
        "tokens_preview": False,
    }


def sync_inferred_variables(project: dict[str, Any]) -> bool:
    """Persist flow-inferred variable keys after a canvas save. Returns True if updated."""
    project_id = str(project.get("id") or "")
    if not project_id:
        return False
    stored = load_project_settings(project_id)
    inferred = _infer_variables(project, list(stored.get("variables") or []))
    if inferred == stored.get("variables"):
        return False
    from server.projects.settings_store import save_project_settings

    stored["variables"] = inferred
    save_project_settings(project_id, stored)
    return True


def update_project_settings(
    project_id: str,
    *,
    visibility: str | None = None,
    variables: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    vis = visibility if visibility in ("private", "workspace") else None
    return patch_project_settings(project_id, visibility=vis, variables=variables)


def issue_project_token(project_id: str, *, label: str) -> tuple[dict[str, Any], str]:
    return create_project_token(project_id, label=label)


def delete_project_token(project_id: str, token_id: str) -> bool:
    return revoke_project_token(project_id, token_id)
