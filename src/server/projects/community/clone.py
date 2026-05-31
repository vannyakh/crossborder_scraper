"""Clone a template flow graph with fresh node and edge ids."""

from __future__ import annotations

import copy
import uuid
from typing import Any


def _new_node_id(kind: str) -> str:
    return f"node-{kind}-{uuid.uuid4().hex[:8]}"


def clone_flow_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    id_map: dict[str, str] = {}
    for node in nodes:
        kind = str(node.get("kind") or "action")
        id_map[str(node["id"])] = _new_node_id(kind)

    cloned_nodes: list[dict[str, Any]] = []
    for node in nodes:
        row = copy.deepcopy(node)
        row["id"] = id_map[str(node["id"])]
        cloned_nodes.append(row)

    cloned_edges: list[dict[str, Any]] = []
    for edge in edges:
        from_id = id_map[str(edge["from"])]
        to_id = id_map[str(edge["to"])]
        row = copy.deepcopy(edge)
        row["id"] = f"e-{from_id}-{to_id}"
        row["from"] = from_id
        row["to"] = to_id
        cloned_edges.append(row)

    return cloned_nodes, cloned_edges
