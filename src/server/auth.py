"""Backward-compatible re-exports — prefer ``server.core.auth``."""

from server.core.auth import (
    authenticate_websocket,
    require_panel_auth,
    verify_panel_credentials,
)

__all__ = [
    "authenticate_websocket",
    "require_panel_auth",
    "verify_panel_credentials",
]
