"""Redis-backed project collaboration relay tests."""

from __future__ import annotations

import asyncio

import fakeredis.aioredis

from server.projects.collaboration import ProjectCollaborationHub
from server.projects.collaboration_redis import CHANNEL_PREFIX, RedisCollaborationRelay


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, payload: str) -> None:
        self.sent.append(payload)


def test_redis_relay_delivers_to_peer_instance() -> None:
    async def run() -> None:
        server = fakeredis.aioredis.FakeRedis(decode_responses=True)
        hub_a = ProjectCollaborationHub()
        hub_b = ProjectCollaborationHub()
        relay_a = RedisCollaborationRelay("redis://test", hub_a)
        relay_b = RedisCollaborationRelay("redis://test", hub_b)
        relay_a._redis = server
        relay_b._redis = server
        relay_a._pubsub = server.pubsub(ignore_subscribe_messages=True)
        relay_b._pubsub = server.pubsub(ignore_subscribe_messages=True)
        hub_a.attach_redis_relay(relay_a)
        hub_b.attach_redis_relay(relay_b)

        await relay_a._pubsub.psubscribe(f"{CHANNEL_PREFIX}*")
        await relay_b._pubsub.psubscribe(f"{CHANNEL_PREFIX}*")
        relay_a._listener_task = asyncio.create_task(relay_a._listen())
        relay_b._listener_task = asyncio.create_task(relay_b._listen())

        ws_b = FakeWebSocket()
        await hub_b.join("demo", client_id="b", username="bob", websocket=ws_b)  # type: ignore[arg-type]
        ws_b.sent.clear()

        await hub_a.broadcast(
            "demo",
            "layout",
            {"client_id": "a", "nodes": [{"id": "node-1", "x": 10, "y": 20}]},
            exclude_client_id="a",
        )
        await asyncio.sleep(0.05)

        assert any("layout" in msg for msg in ws_b.sent)

        relay_a._listener_task.cancel()
        relay_b._listener_task.cancel()
        await relay_a._pubsub.aclose()
        await relay_b._pubsub.aclose()
        await server.aclose()

    asyncio.run(run())
