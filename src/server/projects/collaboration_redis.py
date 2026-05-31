"""Redis pub/sub relay for multi-instance project canvas collaboration."""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import TYPE_CHECKING, Any

from loguru import logger

if TYPE_CHECKING:
    from server.projects.collaboration import ProjectCollaborationHub

CHANNEL_PREFIX = "crossborder:project_collab:"
PRESENCE_PREFIX = "crossborder:project_presence:"
PRESENCE_TTL_SECONDS = 90


class RedisCollaborationRelay:
    """Publish canvas events to Redis and fan-in remote events to the local hub."""

    def __init__(self, redis_url: str, hub: ProjectCollaborationHub) -> None:
        self._redis_url = redis_url
        self._hub = hub
        self._instance_id = uuid.uuid4().hex[:12]
        self._redis: Any = None
        self._pubsub: Any = None
        self._listener_task: asyncio.Task[None] | None = None

    @property
    def instance_id(self) -> str:
        return self._instance_id

    async def start(self) -> None:
        import redis.asyncio as aioredis

        self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        self._pubsub = self._redis.pubsub(ignore_subscribe_messages=True)
        await self._pubsub.psubscribe(f"{CHANNEL_PREFIX}*")
        self._listener_task = asyncio.create_task(self._listen())

    async def stop(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None
        if self._pubsub:
            await self._pubsub.aclose()
            self._pubsub = None
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    def _channel(self, project_id: str) -> str:
        return f"{CHANNEL_PREFIX}{project_id}"

    async def publish(
        self,
        project_id: str,
        event_type: str,
        data: dict[str, Any],
        *,
        exclude_client_id: str | None = None,
    ) -> None:
        if not self._redis:
            return
        payload = json.dumps(
            {
                "origin": self._instance_id,
                "event_type": event_type,
                "data": data,
                "exclude_client_id": exclude_client_id,
            },
            separators=(",", ":"),
        )
        try:
            await self._redis.publish(self._channel(project_id), payload)
        except Exception as exc:
            logger.warning("Project collab Redis publish failed: {}", exc)

    async def sync_presence(self, project_id: str, peers: list[dict[str, Any]]) -> None:
        if not self._redis:
            return
        key = f"{PRESENCE_PREFIX}{project_id}"
        try:
            pipe = self._redis.pipeline()
            await pipe.delete(key)
            if peers:
                mapping = {
                    str(row["client_id"]): json.dumps(row, separators=(",", ":"))
                    for row in peers
                    if row.get("client_id")
                }
                if mapping:
                    await pipe.hset(key, mapping=mapping)
            await pipe.expire(key, PRESENCE_TTL_SECONDS)
            await pipe.execute()
        except Exception as exc:
            logger.warning("Project collab Redis presence sync failed: {}", exc)

    async def remote_presence_items(self) -> list[dict[str, Any]]:
        if not self._redis:
            return []
        items: list[dict[str, Any]] = []
        try:
            async for key in self._redis.scan_iter(match=f"{PRESENCE_PREFIX}*", count=64):
                project_id = str(key)[len(PRESENCE_PREFIX) :]
                if not project_id:
                    continue
                rows = await self._redis.hgetall(key)
                guests: list[dict[str, Any]] = []
                for raw in rows.values():
                    try:
                        guest = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(guest, dict):
                        guests.append(guest)
                if guests:
                    items.append({"project_id": project_id, "guests": guests})
        except Exception as exc:
            logger.warning("Project collab Redis presence read failed: {}", exc)
        return items

    async def _listen(self) -> None:
        assert self._pubsub is not None
        try:
            async for message in self._pubsub.listen():
                if message.get("type") != "pmessage":
                    continue
                channel = str(message.get("channel") or "")
                if not channel.startswith(CHANNEL_PREFIX):
                    continue
                project_id = channel[len(CHANNEL_PREFIX) :]
                raw = message.get("data")
                if not project_id or not raw:
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if not isinstance(payload, dict):
                    continue
                if payload.get("origin") == self._instance_id:
                    continue
                event_type = str(payload.get("event_type") or "")
                data = payload.get("data")
                if not event_type or not isinstance(data, dict):
                    continue
                exclude = payload.get("exclude_client_id")
                exclude_client_id = exclude if isinstance(exclude, str) else None
                await self._hub.deliver_remote(
                    project_id,
                    event_type,
                    data,
                    exclude_client_id=exclude_client_id,
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Project collab Redis listener stopped: {}", exc)


def create_redis_relay(redis_url: str, hub: ProjectCollaborationHub) -> RedisCollaborationRelay:
    return RedisCollaborationRelay(redis_url, hub)
