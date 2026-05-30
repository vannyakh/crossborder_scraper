"""Auth API models — login and CAPTCHA."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CaptchaKind = Literal["image", "audio"]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    captcha_id: str | None = None
    captcha_answer: str | None = None


class LoginResponse(BaseModel):
    ok: bool = True
    username: str
    message: str = "Authenticated"


class AuthStatusResponse(BaseModel):
    auth_enabled: bool
    auth_configured: bool
    login_required: bool
    captcha_required: bool = False


class CaptchaChallengeResponse(BaseModel):
    captcha_id: str
    kind: CaptchaKind
    media_base64: str
    mime_type: str
