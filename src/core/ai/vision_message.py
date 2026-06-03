"""Build multimodal user messages for vision-capable LLM providers."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from config.llm_providers import ApiStyle

_MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_BYTES = _MAX_IMAGE_BYTES


def attachment_from_file(
    path: Path,
    *,
    mime: str = "image/jpeg",
    url_path: str | None = None,
    relative_path: str | None = None,
    source: str = "upload",
) -> dict[str, Any]:
    data = path.read_bytes()
    if len(data) > _MAX_IMAGE_BYTES:
        raise ValueError(f"image too large ({len(data)} bytes; max {_MAX_IMAGE_BYTES})")
    rel = relative_path or path.name
    return {
        "source": source,
        "path": str(path),
        "relative_path": rel,
        "url": url_path or f"/uploads/{rel}",
        "mime": mime,
        "base64": base64.b64encode(data).decode("ascii"),
    }


def build_user_message_content(
    text: str,
    attachments: list[dict[str, Any]] | None,
    *,
    api_style: ApiStyle,
) -> str | list[dict[str, Any]]:
    """Return plain text or provider-specific multimodal content blocks."""
    body = (text or "").strip()
    images = [att for att in (attachments or []) if att.get("base64")]
    if not images:
        return body

    if api_style == "anthropic":
        blocks: list[dict[str, Any]] = []
        if body:
            blocks.append({"type": "text", "text": body})
        for att in images:
            blocks.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": str(att.get("mime") or "image/jpeg"),
                        "data": str(att["base64"]),
                    },
                }
            )
        return blocks

    parts: list[dict[str, Any]] = []
    if body:
        parts.append({"type": "text", "text": body})
    for att in images:
        mime = str(att.get("mime") or "image/jpeg")
        parts.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{att['base64']}",
                },
            }
        )
    return parts
