"""Map database CLI / engine errors to HTTP status codes and panel-safe messages."""

from __future__ import annotations

import re

from fastapi import HTTPException

_MYSQL_CODE = re.compile(r"ERROR (\d+)")


def cli_error_status(detail: str) -> int:
    text = detail.lower()
    if "access denied" in text:
        return 503
    if "already exists" in text or "duplicate entry" in text or "duplicate key" in text:
        return 409
    code_match = _MYSQL_CODE.search(detail)
    if code_match:
        code = int(code_match.group(1))
        if code in (1062, 1050, 1061):
            return 409
        if code in (1063, 1064, 1054, 1146, 1364, 1366, 3814, 4166):
            return 400
    if "does not exist" in text or "unknown column" in text or "syntax" in text:
        return 400
    if "not supported" in text:
        return 400
    return 400


def raise_cli_error(detail: str) -> None:
    cleaned = detail.strip()[:500]
    raise HTTPException(status_code=cli_error_status(cleaned), detail=cleaned)


def reraise_as_client_error(exc: HTTPException) -> None:
    detail = str(exc.detail)
    status = exc.status_code
    if status >= 500:
        status = cli_error_status(detail)
    raise HTTPException(status_code=status, detail=detail) from exc
