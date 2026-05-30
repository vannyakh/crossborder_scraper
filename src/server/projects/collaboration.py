"""In-process project canvas collaboration — presence + flow sync over WebSocket."""

from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

from server.core.events import ws_message


@dataclass
class ProjectCollaborator:
    client_id: str
    username: str
    websocket: WebSocket
    selected_node_id: str | None = None


@dataclass
class ProjectRoom:
    clients: dict[str, ProjectCollaborator] = field(default_factory=dict)


class ProjectCollaborationHub:
    """One room per project id — broadcasts flow updates and selection presence."""

    def __init__(self) -> None:
        self._rooms: dict[str, ProjectRoom] = {}
        self._lock = asyncio.Lock()

    def _room(self, project_id: str) -> ProjectRoom:
        return self._rooms.setdefault(project_id, ProjectRoom())

    def peers_payload(self, project_id: str) -> list[dict[str, Any]]:
        room = self._rooms.get(project_id)
        if not room:
            return []
        return [
            {
                "client_id": client.client_id,
                "username": client.username,
                "selected_node_id": client.selected_node_id,
            }
            for client in room.clients.values()
        ]

    def presence_items(self) -> list[dict[str, Any]]:
        return [
            {
                "project_id": project_id,
                "guests": self.peers_payload(project_id),
            }
            for project_id, room in self._rooms.items()
            if room.clients
        ]

    async def join(
        self,
        project_id: str,
        *,
        client_id: str,
        username: str,
        websocket: WebSocket,
    ) -> None:
        async with self._lock:
            room = self._room(project_id)
            room.clients[client_id] = ProjectCollaborator(
                client_id=client_id,
                username=username,
                websocket=websocket,
            )
        await self.broadcast(project_id, "peers", {"peers": self.peers_payload(project_id)})

    async def leave(self, project_id: str, client_id: str) -> None:
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room:
                return
            room.clients.pop(client_id, None)
            if not room.clients:
                self._rooms.pop(project_id, None)
                return
        await self.broadcast(project_id, "peers", {"peers": self.peers_payload(project_id)})

    async def set_selection(
        self,
        project_id: str,
        *,
        client_id: str,
        node_id: str | None,
    ) -> None:
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room:
                return
            client = room.clients.get(client_id)
            if not client:
                return
            client.selected_node_id = node_id
            username = client.username
        await self.broadcast(
            project_id,
            "selection",
            {
                "client_id": client_id,
                "username": username,
                "node_id": node_id,
            },
            exclude_client_id=client_id,
        )

    async def notify_flow_updated(
        self,
        project_id: str,
        project: dict[str, Any],
        *,
        source_client_id: str | None = None,
    ) -> None:
        await self.broadcast(
            project_id,
            "flow_updated",
            {
                "client_id": source_client_id,
                "project": project,
            },
            exclude_client_id=source_client_id,
        )

    async def relay_layout(
        self,
        project_id: str,
        *,
        client_id: str,
        nodes: list[dict[str, Any]],
    ) -> None:
        await self.broadcast(
            project_id,
            "layout",
            {
                "client_id": client_id,
                "nodes": nodes,
            },
            exclude_client_id=client_id,
        )

    async def broadcast(
        self,
        project_id: str,
        event_type: str,
        data: dict[str, Any],
        *,
        exclude_client_id: str | None = None,
    ) -> None:
        room = self._rooms.get(project_id)
        if not room:
            return
        payload = ws_message(event_type, data)
        stale: list[str] = []
        for client_id, client in list(room.clients.items()):
            if exclude_client_id and client_id == exclude_client_id:
                continue
            try:
                await client.websocket.send_text(payload)
            except Exception:
                stale.append(client_id)
        for client_id in stale:
            await self.leave(project_id, client_id)

    async def handle_message(
        self,
        project_id: str,
        *,
        client_id: str,
        raw: str,
    ) -> None:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return
        if not isinstance(message, dict):
            return
        action = message.get("action")
        if action == "selection":
            node_id = message.get("node_id")
            if node_id is not None and not isinstance(node_id, str):
                return
            await self.set_selection(project_id, client_id=client_id, node_id=node_id)
        elif action == "layout":
            raw_nodes = message.get("nodes")
            if not isinstance(raw_nodes, list):
                return
            nodes: list[dict[str, Any]] = []
            for item in raw_nodes:
                if not isinstance(item, dict):
                    continue
                node_id = item.get("id")
                x = item.get("x")
                y = item.get("y")
                if not isinstance(node_id, str) or not node_id:
                    continue
                if not isinstance(x, int | float) or not isinstance(y, int | float):
                    continue
                patch: dict[str, Any] = {"id": node_id, "x": float(x), "y": float(y)}
                note_width = item.get("note_width", item.get("noteWidth"))
                note_height = item.get("note_height", item.get("noteHeight"))
                if isinstance(note_width, int | float):
                    patch["note_width"] = float(note_width)
                if isinstance(note_height, int | float):
                    patch["note_height"] = float(note_height)
                nodes.append(patch)
            if not nodes:
                return
            await self.relay_layout(project_id, client_id=client_id, nodes=nodes)
        elif action == "ping":
            room = self._rooms.get(project_id)
            if not room or client_id not in room.clients:
                return
            ws = room.clients[client_id].websocket
            await ws.send_text(ws_message("pong", {"client_id": client_id}))


_hub: ProjectCollaborationHub | None = None


def get_project_collaboration_hub() -> ProjectCollaborationHub:
    global _hub
    if _hub is None:
        _hub = ProjectCollaborationHub()
    return _hub


def new_client_id() -> str:
    return uuid.uuid4().hex[:12]
