from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from config import get_settings
from server.auth import verify_panel_credentials
from server.schemas.auth import (
    AuthStatusResponse,
    CaptchaChallengeResponse,
    LoginRequest,
    LoginResponse,
)
from server.services.audit import log_operation
from server.services.login_captcha import (
    captcha_required_for,
    clear_login_failures,
    client_key,
    create_captcha_challenge,
    record_failed_login,
    verify_captcha_answer,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _login_failure_detail(*, captcha_required: bool) -> dict[str, Any]:
    return {
        "message": "Invalid username or password",
        "captcha_required": captcha_required,
    }


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(request: Request) -> AuthStatusResponse:
    settings = get_settings()
    configured = bool(settings.panel_username and settings.panel_password)
    key = client_key(request)
    return AuthStatusResponse(
        auth_enabled=settings.panel_auth_enabled,
        auth_configured=configured,
        login_required=settings.panel_auth_enabled and configured,
        captcha_required=captcha_required_for(key),
    )


@router.get("/captcha", response_model=CaptchaChallengeResponse)
async def issue_captcha(request: Request) -> CaptchaChallengeResponse:
    key = client_key(request)
    if not captcha_required_for(key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Captcha not required yet",
        )
    payload = create_captcha_challenge()
    return CaptchaChallengeResponse(
        captcha_id=payload.captcha_id,
        kind=payload.kind,
        media_base64=payload.media_base64,
        mime_type=payload.mime_type,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request) -> LoginResponse:
    settings = get_settings()
    key = client_key(request)
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

    needs_captcha = captcha_required_for(key)
    if needs_captcha:
        if not body.captcha_id or not body.captcha_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Captcha verification required",
                    "captcha_required": True,
                },
            )
        if not verify_captcha_answer(body.captcha_id, body.captcha_answer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Incorrect captcha — try again",
                    "captcha_required": True,
                },
            )

    if not verify_panel_credentials(body.username, body.password):
        record_failed_login(key)
        log_operation(
            user=body.username,
            operation_type="Login",
            details=f"Login IP: {client_ip} — failed",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_login_failure_detail(captcha_required=captcha_required_for(key)),
        )

    clear_login_failures(key)
    log_operation(
        user=body.username,
        operation_type="Login",
        details=f"Login IP: {client_ip} — successfully logged in",
    )
    return LoginResponse(username=body.username)
