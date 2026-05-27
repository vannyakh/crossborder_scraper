"""Shared server primitives (auth, constants, events, panel bind)."""

from server.core.auth import authenticate_websocket, require_panel_auth, verify_panel_credentials
from server.core.constants import APP_VERSION, SERVICE_STARTED_AT
from server.core.deps import protected_router
from server.core.events import BatchEvent, BatchEventBus, batch_events, sse_frame, ws_message
from server.core.panel_bind import PanelBindInfo, configure_panel_bind, get_panel_bind_info

__all__ = [
    "APP_VERSION",
    "SERVICE_STARTED_AT",
    "BatchEvent",
    "BatchEventBus",
    "PanelBindInfo",
    "authenticate_websocket",
    "batch_events",
    "configure_panel_bind",
    "get_panel_bind_info",
    "protected_router",
    "require_panel_auth",
    "sse_frame",
    "verify_panel_credentials",
    "ws_message",
]
