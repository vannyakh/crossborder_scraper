"""Login CAPTCHA — required after a failed sign-in (image or audio, random)."""

from __future__ import annotations

import base64
import secrets
import time
from dataclasses import dataclass
from threading import Lock
from typing import Literal

from captcha.audio import AudioCaptcha
from captcha.image import ImageCaptcha
from starlette.requests import Request

CaptchaKind = Literal["image", "audio"]

_CAPTCHA_TTL_SEC = 300
_FAILURE_THRESHOLD = 1
_TEXT_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
_TEXT_LENGTH = 5

_lock = Lock()
_challenges: dict[str, tuple[str, CaptchaKind, float]] = {}
_fail_counts: dict[str, int] = {}


@dataclass(frozen=True)
class CaptchaPayload:
    captcha_id: str
    kind: CaptchaKind
    media_base64: str
    mime_type: str


def client_key(request: Request) -> str:
    if request.client:
        return request.client.host
    return "unknown"


def captcha_required_for(key: str) -> bool:
    with _lock:
        return _fail_counts.get(key, 0) >= _FAILURE_THRESHOLD


def record_failed_login(key: str) -> None:
    with _lock:
        _fail_counts[key] = _fail_counts.get(key, 0) + 1


def clear_login_failures(key: str) -> None:
    with _lock:
        _fail_counts.pop(key, None)


def _purge_expired(now: float | None = None) -> None:
    ts = now if now is not None else time.time()
    expired = [cid for cid, (_, _, exp) in _challenges.items() if exp <= ts]
    for cid in expired:
        _challenges.pop(cid, None)


def _random_code() -> str:
    return "".join(secrets.choice(_TEXT_ALPHABET) for _ in range(_TEXT_LENGTH))


def create_captcha_challenge() -> CaptchaPayload:
    code = _random_code()
    kind: CaptchaKind = secrets.choice(["image", "audio"])

    if kind == "image":
        generator = ImageCaptcha(width=220, height=80)
        raw = generator.generate(code)
        media = bytes(raw.getbuffer()) if hasattr(raw, "getbuffer") else bytes(raw)
        mime = "image/png"
    else:
        generator = AudioCaptcha()
        raw = generator.generate(code)
        media = bytes(raw)
        mime = "audio/wav"

    captcha_id = secrets.token_urlsafe(16)
    expires = time.time() + _CAPTCHA_TTL_SEC
    with _lock:
        _purge_expired()
        _challenges[captcha_id] = (code.upper(), kind, expires)

    return CaptchaPayload(
        captcha_id=captcha_id,
        kind=kind,
        media_base64=base64.b64encode(media).decode("ascii"),
        mime_type=mime,
    )


def _digest_match(provided: str, expected: str) -> bool:
    try:
        a = provided.encode("ascii")
        b = expected.encode("ascii")
    except UnicodeEncodeError:
        return False
    return secrets.compare_digest(a, b)


def verify_captcha_answer(captcha_id: str, answer: str) -> bool:
    normalized = (answer or "").strip().upper().replace(" ", "")
    if not captcha_id or not normalized:
        return False

    with _lock:
        _purge_expired()
        row = _challenges.pop(captcha_id, None)
    if not row:
        return False
    expected, _, _ = row
    return _digest_match(normalized, expected)
