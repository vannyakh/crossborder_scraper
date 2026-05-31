"""Panel HTTP Basic auth and WebSocket credential checks."""

import base64
import secrets

from fastapi import Depends, HTTPException, Request, WebSocket, status
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


def _project_token_user(request: Request) -> str | None:
    return getattr(request.state, "project_token_auth", None)


def require_panel_auth(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(_security),
) -> str:
    token_user = _project_token_user(request)
    if token_user:
        return token_user

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


def _parse_bearer_authorization(value: str) -> str | None:
    raw_value = value.strip()
    if not raw_value.lower().startswith("bearer "):
        return None
    token = raw_value[6:].strip()
    return token or None


def authenticate_websocket(websocket: WebSocket, *, project_id: str | None = None) -> str | None:
    """Validate panel credentials or a project API token for a WebSocket upgrade."""
    settings = get_settings()
    if not settings.panel_auth_enabled and project_id is None:
        return "anonymous"

    auth = websocket.query_params.get("authorization") or websocket.headers.get("authorization")
    if auth:
        parsed = _parse_basic_authorization(auth)
        if parsed:
            username, password = parsed
            if verify_panel_credentials(username, password):
                return username

        bearer = _parse_bearer_authorization(auth)
        if bearer and project_id:
            from server.projects.settings_store import verify_project_token

            entry = verify_project_token(project_id, bearer)
            if entry:
                return f"token:{entry.get('label') or 'API token'}"

    project_token = websocket.query_params.get("project_token")
    if project_token and project_id:
        from server.projects.settings_store import verify_project_token

        entry = verify_project_token(project_id, project_token)
        if entry:
            return f"token:{entry.get('label') or 'API token'}"

    if not settings.panel_auth_enabled:
        return "anonymous"
    return None
