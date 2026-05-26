from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from config import get_settings
from server.auth import verify_panel_credentials

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
async def login(body: LoginRequest) -> LoginResponse:
    settings = get_settings()
    if not settings.panel_auth_enabled:
        return LoginResponse(username=body.username, message="Auth disabled")

    if not settings.panel_username or not settings.panel_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Panel credentials not configured. Run: scraper setup",
        )

    if not verify_panel_credentials(body.username, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return LoginResponse(username=body.username)
