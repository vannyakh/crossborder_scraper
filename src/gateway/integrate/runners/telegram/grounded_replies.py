"""Tool-first Telegram replies — skip LLM for known read-only status intents."""

from __future__ import annotations

import re
from typing import Any, Literal

from gateway.integrate.runners.telegram.reply_scope import (
    format_network_location_reply,
    format_runtime_status_reply,
    format_unsupported_reply,
    location_reply_mode,
    match_unsupported,
)
from gateway.tools import execute_tool

GroundedIntent = Literal["network_location", "runtime_status"]

_NETWORK_LOCATION = re.compile(
    r"\b("
    r"location|where am i|public ip|panel url|login url|server ip|"
    r"your location|you location|my ip|network access|bind address"
    r")\b",
    re.I,
)

_LOCATION_ASK = re.compile(
    r"\b(let me know|tell me|show me|what is|what's)\b.*\b("
    r"location|ip|where|address|url"
    r")\b",
    re.I,
)

_RUNTIME_STATUS = re.compile(
    r"\b("
    r"runtime status|engine status|engine health|panel health|"
    r"gateway status|is the engine|scraper status|running batches"
    r")\b",
    re.I,
)


def match_grounded_intent(text: str) -> GroundedIntent | None:
    body = (text or "").strip()
    if not body:
        return None
    if _NETWORK_LOCATION.search(body) or _LOCATION_ASK.search(body):
        return "network_location"
    if _RUNTIME_STATUS.search(body):
        return "runtime_status"
    return None


def augment_message_for_grounding(text: str) -> str:
    """Append hard constraints when LLM path is used."""
    intent = match_grounded_intent(text)
    base = (
        "Answer ONLY what the operator asked — no extra URLs, checks, or diagnostics. "
        "If unsupported, say not supported in 2–3 lines. Plain text, no Markdown."
    )
    if intent == "network_location":
        return (
            f"{text.strip()}\n\n"
            f"[Required: call network_access_status. {base} "
            "For location asks: public IP only; say region is unavailable — do not invent.]"
        )
    if intent == "runtime_status":
        return f"{text.strip()}\n\n[Required: call runtime_status. {base}]"
    return f"{text.strip()}\n\n[{base} Use a tool or say not supported — never guess.]"


async def try_grounded_telegram_turn(
    svc: Any,
    *,
    channel_id: str,
    platform_chat_id: str | int,
    message: str,
    platform_chat_title: str | None = None,
    prompt_id: str | None = None,
) -> dict[str, Any] | None:
    """
    Direct tool or refusal replies — no LLM hallucination.

    Returns None when the message should go to the LLM agent.
    """
    body = (message or "").strip()
    if not body:
        return None

    unsupported = match_unsupported(body)
    if unsupported:
        return _finish_turn(
            channel_id=channel_id,
            platform_chat_id=platform_chat_id,
            platform_chat_title=platform_chat_title,
            prompt_id=prompt_id,
            message=body,
            result={
                "ok": True,
                "message": format_unsupported_reply(unsupported),
                "tool_calls": [],
            },
        )

    intent = match_grounded_intent(body)
    if intent is None:
        return None

    from gateway.integrate.bot_sessions import resolve_bot_session
    from server.manager import get_manager

    session = resolve_bot_session(
        channel_id,
        platform_chat_id,
        platform_chat_title=platform_chat_title,
        prompt_id=prompt_id,
    )
    mgr = get_manager()

    if intent == "network_location":
        tool_name = "network_access_status"
        tool_out = await execute_tool(tool_name, {}, manager=mgr)
        if not tool_out.get("ok"):
            result = {
                "ok": False,
                "message": f"Could not read network status: {tool_out.get('error', 'error')}",
                "tool_calls": [],
            }
        else:
            mode = location_reply_mode(body)
            body_text = format_network_location_reply(tool_out.get("result") or {}, mode=mode)
            result = {"ok": True, "message": body_text, "tool_calls": []}
    else:
        tool_name = "runtime_status"
        tool_out = await execute_tool(tool_name, {}, manager=mgr)
        if not tool_out.get("ok"):
            result = {
                "ok": False,
                "message": f"Could not read engine status: {tool_out.get('error', 'error')}",
                "tool_calls": [],
            }
        else:
            result = {
                "ok": True,
                "message": format_runtime_status_reply(tool_out.get("result") or {}),
                "tool_calls": [],
            }

    result["session_id"] = session["id"]
    result["prompt_id"] = prompt_id or session.get("prompt_id")
    return _finish_turn(
        channel_id=channel_id,
        platform_chat_id=platform_chat_id,
        platform_chat_title=platform_chat_title,
        prompt_id=prompt_id,
        message=body,
        result=result,
        session=session,
    )


def _finish_turn(
    *,
    channel_id: str,
    platform_chat_id: str | int,
    message: str,
    result: dict[str, Any],
    platform_chat_title: str | None = None,
    prompt_id: str | None = None,
    session: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from gateway.chat_sessions import append_turn
    from gateway.integrate.bot_sessions import resolve_bot_session

    if session is None:
        session = resolve_bot_session(
            channel_id,
            platform_chat_id,
            platform_chat_title=platform_chat_title,
            prompt_id=prompt_id,
        )
    append_turn(
        session["id"],
        user_message=message.strip(),
        assistant_message=str(result.get("message") or ""),
        ok=bool(result.get("ok")),
        tool_calls=result.get("tool_calls") or [],
        model_ref=None,
        prompt_id=result.get("prompt_id") or session.get("prompt_id"),
    )
    result.setdefault("session_id", session["id"])
    result["channel_id"] = channel_id
    result["platform_chat_id"] = str(platform_chat_id)
    return result
