"""Project canvas collaboration hub tests."""

from __future__ import annotations

import asyncio

from server.projects.collaboration import ProjectCollaborationHub


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, payload: str) -> None:
        self.sent.append(payload)


def test_join_and_peers_broadcast() -> None:
    async def run() -> None:
        hub = ProjectCollaborationHub()
        ws_a = FakeWebSocket()
        ws_b = FakeWebSocket()

        await hub.join("demo", client_id="a", username="alice", websocket=ws_a)  # type: ignore[arg-type]
        await hub.join("demo", client_id="b", username="bob", websocket=ws_b)  # type: ignore[arg-type]

        assert len(hub.peers_payload("demo")) == 2
        assert any("peers" in msg for msg in ws_b.sent)

        await hub.leave("demo", "a")
        assert len(hub.peers_payload("demo")) == 1

    asyncio.run(run())


def test_selection_broadcast_excludes_sender() -> None:
    async def run() -> None:
        hub = ProjectCollaborationHub()
        ws_a = FakeWebSocket()
        ws_b = FakeWebSocket()

        await hub.join("demo", client_id="a", username="alice", websocket=ws_a)  # type: ignore[arg-type]
        await hub.join("demo", client_id="b", username="bob", websocket=ws_b)  # type: ignore[arg-type]

        ws_a.sent.clear()
        ws_b.sent.clear()

        await hub.set_selection("demo", client_id="a", node_id="node-1")

        assert ws_a.sent == []
        assert len(ws_b.sent) == 1
        assert "selection" in ws_b.sent[0]

    asyncio.run(run())
