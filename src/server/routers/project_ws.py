"""Project flow canvas collaboration WebSocket."""

import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from server.auth import authenticate_websocket
from server.core.events import ws_message
from server.projects.collaboration import get_project_collaboration_hub
from server.services.project_service import get_project_service

ws_router = APIRouter(prefix="/projects", tags=["projects"])


@ws_router.websocket("/{project_id}/ws")
async def project_collaboration_ws(
    websocket: WebSocket,
    project_id: str,
    client_id: str = Query(..., min_length=8, max_length=64),
) -> None:
    username = authenticate_websocket(websocket, project_id=project_id)
    if username is None:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    project = get_project_service().get_project(project_id)
    if not project:
        await websocket.close(code=4404, reason="project not found")
        return

    hub = get_project_collaboration_hub()
    await websocket.accept()
    await hub.join(project_id, client_id=client_id, username=username, websocket=websocket)
    await websocket.send_text(
        ws_message(
            "welcome",
            {
                "project_id": project_id,
                "client_id": client_id,
                "username": username,
                "peers": hub.peers_payload(project_id),
                "project": project,
            },
        )
    )

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=25.0)
            except TimeoutError:
                await websocket.send_text(
                    ws_message("heartbeat", {"project_id": project_id, "client_id": client_id})
                )
                continue
            await hub.handle_message(project_id, client_id=client_id, raw=raw)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(project_id, client_id)
