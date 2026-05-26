from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from config import get_settings
from server.auth import verify_panel_credentials
from server.services.audit import log_operation

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    ok: bool = True
    username: str
    message: str = "Authenticated"


@router.get("/status")
async def auth_status() -> dict[str, Any]:
    settings = get_settings()
    configured = bool(settings.panel_username and settings.panel_password)
    return {
        "auth_enabled": settings.panel_auth_enabled,
        "auth_configured": configured,
        "login_required": settings.panel_auth_enabled and configured,
    }


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request) -> LoginResponse:
    settings = get_settings()
    client_ip = "unknown"
    if request.client:
        client_ip = f"{request.client.host}:{request.client.port}"

    if not settings.panel_auth_enabled:
        log_operation(
            user=body.username,
            operation_type="Login",
            details=f"Login IP: {client_ip} — auth disabled",
        )
        return LoginResponse(username=body.username, message="Auth disabled")

    if not settings.panel_username or not settings.panel_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Panel credentials not configured. Run: scraper setup",
        )

    if not verify_panel_credentials(body.username, body.password):
        log_operation(
            user=body.username,
            operation_type="Login",
            details=f"Login IP: {client_ip} — failed",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    log_operation(
        user=body.username,
        operation_type="Login",
        details=f"Login IP: {client_ip} — successfully logged in",
    )
    return LoginResponse(username=body.username)
