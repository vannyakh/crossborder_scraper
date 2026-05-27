"""Panel HTTP Basic auth and WebSocket credential checks."""

import base64
import secrets

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from config import get_settings

_security = HTTPBasic(auto_error=False)


def verify_panel_credentials(username: str, password: str) -> bool:
    settings = get_settings()
    if not settings.panel_auth_enabled:
        return True
    if not settings.panel_username or not settings.panel_password:
        return False
    user_ok = secrets.compare_digest(username, settings.panel_username)
    pass_ok = secrets.compare_digest(password, settings.panel_password)
    return user_ok and pass_ok


def require_panel_auth(
    credentials: HTTPBasicCredentials | None = Depends(_security),
) -> str:
    settings = get_settings()
    if not settings.panel_auth_enabled:
        return credentials.username if credentials else "anonymous"

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    if not verify_panel_credentials(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username


def _parse_basic_authorization(value: str) -> tuple[str, str] | None:
    raw_value = value.strip()
    if not raw_value.lower().startswith("basic "):
        return None
    try:
        decoded = base64.b64decode(raw_value[6:].strip(), validate=True).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    username, sep, password = decoded.partition(":")
    if not sep:
        return None
    return username, password


def authenticate_websocket(websocket: WebSocket) -> str | None:
    """Validate panel credentials for a WebSocket upgrade (query or header)."""
    settings = get_settings()
    if not settings.panel_auth_enabled:
        return "anonymous"

    auth = websocket.query_params.get("authorization") or websocket.headers.get("authorization")
    if not auth:
        return None

    parsed = _parse_basic_authorization(auth)
    if not parsed:
        return None

    username, password = parsed
    if verify_panel_credentials(username, password):
        return username
    return None
