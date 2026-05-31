"""Derived project fields (preview canvas, service health counts)."""

from __future__ import annotations

from typing import Any

_DERIVED_KEYS = frozenset({"preview_nodes", "preview_edges", "services_online", "services_total"})


def count_service_health(nodes: list[dict[str, Any]]) -> dict[str, int]:
    services = [n for n in nodes if n.get("role") not in ("config", "trigger")]
    with_status = [n for n in services if n.get("status") is not None]
    if not with_status:
        return {"services_online": 0, "services_total": len(services)}
    online = sum(1 for n in with_status if n.get("status") == "online")
    return {"services_online": online, "services_total": len(with_status)}


def build_preview(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    main_edges = [e for e in edges if (e.get("kind") or "main") == "main"]
    flow_nodes = [n for n in nodes if n.get("role") != "config"]
    incoming = {e["to"] for e in main_edges}
    roots = [n for n in flow_nodes if n["id"] not in incoming]
    start = next((n for n in roots if n.get("role") == "trigger"), None)
    if start is None:
        start = roots[0] if roots else (flow_nodes[0] if flow_nodes else None)
    if start is None:
        return {"preview_nodes": [], "preview_edges": []}

    path: list[dict[str, Any]] = [start]
    cursor = start["id"]
    while len(path) < 4:
        next_edge = next((e for e in main_edges if e["from"] == cursor), None)
        if not next_edge:
            break
        next_node = next((n for n in flow_nodes if n["id"] == next_edge["to"]), None)
        if not next_node or any(n["id"] == next_node["id"] for n in path):
            break
        path.append(next_node)
        cursor = next_node["id"]

    slots = [
        {"x": 18, "y": 22},
        {"x": 42, "y": 48},
        {"x": 66, "y": 22},
        {"x": 82, "y": 48},
    ]
    id_map: dict[str, str] = {}
    preview_nodes: list[dict[str, Any]] = []
    for index, node in enumerate(path):
        pid = f"pv-{index}"
        id_map[node["id"]] = pid
        slot = slots[index] if index < len(slots) else slots[-1]
        preview_nodes.append({**node, "id": pid, "x": slot["x"], "y": slot["y"]})

    preview_edges: list[dict[str, Any]] = []
    for index, edge in enumerate(main_edges):
        if edge["from"] not in id_map or edge["to"] not in id_map:
            continue
        preview_edges.append(
            {
                "id": f"pv-e{index + 1}",
                "from": id_map[edge["from"]],
                "to": id_map[edge["to"]],
            }
        )

    return {"preview_nodes": preview_nodes, "preview_edges": preview_edges}


def apply_derived_fields(record: dict[str, Any]) -> dict[str, Any]:
    """Compute preview + service health at read time (not required on disk)."""
    nodes = record.get("nodes") or []
    edges = record.get("edges") or []
    health = count_service_health(nodes)
    preview = build_preview(nodes, edges)
    revision = int(record.get("flow_revision") or 0)
    return {**record, **health, **preview, "flow_revision": revision}


def strip_derived_fields(record: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in record.items() if key not in _DERIVED_KEYS}


def finalize_project(record: dict[str, Any]) -> dict[str, Any]:
    """Return record with derived fields for API responses."""
    return apply_derived_fields(record)


def bump_flow_revision(record: dict[str, Any]) -> dict[str, Any]:
    record["flow_revision"] = int(record.get("flow_revision") or 0) + 1
    return record
