"""Resolve and sync gateway agent chat sessions for integrate bot platforms."""

from __future__ import annotations

from typing import Any

from gateway.chat_sessions import get_or_create_platform_session


def platform_session_label(
    channel_id: str,
    platform_chat_id: str | int,
    *,
    platform_chat_title: str | None = None,
) -> str:
    title = (platform_chat_title or "").strip()
    if title:
        return title
    if channel_id == "telegram":
        try:
            kind = "group" if int(str(platform_chat_id)) < 0 else "direct"
        except ValueError:
            kind = "direct"
        prefix = "Telegram group" if kind == "group" else "Telegram DM"
        return f"{prefix} · {platform_chat_id}"
    return f"{channel_id.title()} · {platform_chat_id}"


def resolve_bot_session(
    channel_id: str,
    platform_chat_id: str | int,
    *,
    platform_chat_title: str | None = None,
    prompt_id: str | None = None,
) -> dict[str, Any]:
    """Get or create a panel-visible session keyed by integrate channel + platform chat id."""
    pid = str(platform_chat_id).strip()
    if not pid:
        raise ValueError("platform_chat_id is required")
    return get_or_create_platform_session(
        channel_id,
        pid,
        label=platform_session_label(
            channel_id,
            pid,
            platform_chat_title=platform_chat_title,
        ),
        platform_chat_title=platform_chat_title,
        prompt_id=prompt_id or "gateway_agent",
    )


async def run_agent_via_bot_session(
    svc: Any,
    *,
    channel_id: str,
    platform_chat_id: str | int,
    message: str,
    platform_chat_title: str | None = None,
    prompt_id: str | None = None,
    skill_ids: list[str] | None = None,
) -> dict[str, Any]:
    session = resolve_bot_session(
        channel_id,
        platform_chat_id,
        platform_chat_title=platform_chat_title,
        prompt_id=prompt_id,
    )
    resolved_prompt = prompt_id or session.get("prompt_id")
    result = await svc.run_agent(
        message,
        prompt_id=resolved_prompt,
        skill_ids=skill_ids,
        session_id=session["id"],
    )
    result["channel_id"] = channel_id
    result["platform_chat_id"] = str(platform_chat_id)
    if platform_chat_title:
        result["platform_chat_title"] = platform_chat_title
    return result
