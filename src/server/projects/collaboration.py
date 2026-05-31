"""In-process project canvas collaboration — presence + flow sync over WebSocket."""

from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from fastapi import WebSocket

from server.core.events import ws_message

if TYPE_CHECKING:
    from server.projects.collaboration_redis import RedisCollaborationRelay


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

    def __init__(self, *, redis_relay: RedisCollaborationRelay | None = None) -> None:
        self._rooms: dict[str, ProjectRoom] = {}
        self._lock = asyncio.Lock()
        self._redis_relay = redis_relay

    def attach_redis_relay(self, relay: RedisCollaborationRelay) -> None:
        self._redis_relay = relay

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

    async def presence_items_merged(self) -> list[dict[str, Any]]:
        """Local rooms merged with Redis presence when a relay is configured."""
        merged: dict[str, dict[str, dict[str, Any]]] = {}
        for row in self.presence_items():
            project_id = str(row["project_id"])
            bucket = merged.setdefault(project_id, {})
            for guest in row["guests"]:
                client_id = str(guest.get("client_id") or "")
                if client_id:
                    bucket[client_id] = guest

        if self._redis_relay:
            for row in await self._redis_relay.remote_presence_items():
                project_id = str(row["project_id"])
                bucket = merged.setdefault(project_id, {})
                for guest in row.get("guests") or []:
                    client_id = str(guest.get("client_id") or "")
                    if client_id and client_id not in bucket:
                        bucket[client_id] = guest

        return [
            {"project_id": project_id, "guests": list(guests.values())}
            for project_id, guests in merged.items()
            if guests
        ]

    async def _sync_presence(self, project_id: str) -> None:
        if not self._redis_relay:
            return
        await self._redis_relay.sync_presence(project_id, self.peers_payload(project_id))

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
        await self._sync_presence(project_id)
        await self.broadcast(project_id, "peers", {"peers": self.peers_payload(project_id)})

    async def leave(self, project_id: str, client_id: str) -> None:
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room:
                return
            room.clients.pop(client_id, None)
            empty = not room.clients
            if empty:
                self._rooms.pop(project_id, None)
        await self._sync_presence(project_id)
        if empty:
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
        await self._sync_presence(project_id)
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

    async def deliver_remote(
        self,
        project_id: str,
        event_type: str,
        data: dict[str, Any],
        *,
        exclude_client_id: str | None = None,
    ) -> None:
        """Apply an event from another panel instance without re-publishing to Redis."""
        await self._broadcast_local(
            project_id,
            event_type,
            data,
            exclude_client_id=exclude_client_id,
        )

    async def broadcast(
        self,
        project_id: str,
        event_type: str,
        data: dict[str, Any],
        *,
        exclude_client_id: str | None = None,
    ) -> None:
        await self._broadcast_local(
            project_id,
            event_type,
            data,
            exclude_client_id=exclude_client_id,
        )
        if self._redis_relay:
            await self._redis_relay.publish(
                project_id,
                event_type,
                data,
                exclude_client_id=exclude_client_id,
            )

    async def _broadcast_local(
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
_redis_relay: RedisCollaborationRelay | None = None


def get_project_collaboration_hub() -> ProjectCollaborationHub:
    global _hub
    if _hub is None:
        _hub = ProjectCollaborationHub()
    return _hub


async def start_project_collaboration_hub() -> None:
    """Attach Redis pub/sub relay when ``CROSSBORDER_PROJECT_COLLAB_REDIS_URL`` is set."""
    global _redis_relay
    from config import get_settings

    settings = get_settings()
    url = (settings.project_collab_redis_url or "").strip()
    if not url or _redis_relay is not None:
        return

    from server.projects.collaboration_redis import create_redis_relay

    hub = get_project_collaboration_hub()
    relay = create_redis_relay(url, hub)
    hub.attach_redis_relay(relay)
    await relay.start()
    _redis_relay = relay


async def stop_project_collaboration_hub() -> None:
    global _redis_relay
    if _redis_relay is None:
        return
    await _redis_relay.stop()
    _redis_relay = None


def new_client_id() -> str:
    return uuid.uuid4().hex[:12]
