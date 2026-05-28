"""Persist panel gateway chat sessions (multi-turn history per session)."""

from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Any

PANEL_CHANNEL_ID = "panel"
MAX_SESSIONS = 50
MAX_HISTORY_MESSAGES = 24
DEFAULT_SESSION_LABEL = "New session"


def platform_chat_kind(record: dict[str, Any]) -> str | None:
    channel_id = record.get("channel_id")
    if channel_id != "telegram":
        return None
    pid = record.get("platform_chat_id")
    if not pid:
        return None
    try:
        return "group" if int(str(pid)) < 0 else "direct"
    except ValueError:
        return "unknown"


def enrich_session(record: dict[str, Any]) -> dict[str, Any]:
    messages = record.get("messages") or []
    message_count = sum(1 for m in messages if m.get("role") in ("user", "assistant"))
    title = str(record.get("platform_chat_title") or "").strip()
    display_label = title or str(record.get("label") or DEFAULT_SESSION_LABEL).strip()
    return {
        **record,
        "message_count": message_count,
        "platform_chat_kind": platform_chat_kind(record),
        "display_label": display_label,
    }


def session_channel_summaries(sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    labels = {
        "panel": "Panel",
        "telegram": "Telegram",
        "discord": "Discord",
        "slack": "Slack",
        "email": "Email",
    }
    counts: dict[str, int] = {}
    for session in sessions:
        cid = str(session.get("channel_id") or PANEL_CHANNEL_ID)
        counts[cid] = counts.get(cid, 0) + 1
    order = ["panel", "telegram", "discord", "slack", "email"]
    seen = set(order) | set(counts)
    rows: list[dict[str, Any]] = []
    for cid in order:
        if cid in counts:
            rows.append(
                {"channel_id": cid, "label": labels.get(cid, cid.title()), "count": counts[cid]}
            )
    for cid in sorted(seen - set(order)):
        if cid in counts:
            rows.append(
                {"channel_id": cid, "label": labels.get(cid, cid.title()), "count": counts[cid]}
            )
    return rows


def chat_sessions_path():
    from core.paths import data_dir

    return data_dir() / "agent_chat_sessions.json"


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _read_store() -> dict[str, Any]:
    path = chat_sessions_path()
    if not path.exists():
        return {"sessions": []}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"sessions": []}
    if not isinstance(raw, dict):
        return {"sessions": []}
    sessions = raw.get("sessions")
    if not isinstance(sessions, list):
        return {"sessions": []}
    return {"sessions": sessions}


def _write_store(data: dict[str, Any]) -> None:
    path = chat_sessions_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _normalize_session(raw: dict[str, Any]) -> dict[str, Any]:
    messages = raw.get("messages")
    if not isinstance(messages, list):
        messages = []
    platform_chat_id = raw.get("platform_chat_id")
    if platform_chat_id is not None:
        platform_chat_id = str(platform_chat_id).strip() or None
    platform_chat_title = raw.get("platform_chat_title")
    if platform_chat_title is not None:
        platform_chat_title = str(platform_chat_title).strip() or None
    return {
        "id": str(raw.get("id") or uuid.uuid4().hex[:12]),
        "label": str(raw.get("label") or DEFAULT_SESSION_LABEL).strip() or DEFAULT_SESSION_LABEL,
        "channel_id": str(raw.get("channel_id") or PANEL_CHANNEL_ID),
        "platform_chat_id": platform_chat_id,
        "platform_chat_title": platform_chat_title,
        "prompt_id": str(raw.get("prompt_id") or "gateway_agent").strip() or "gateway_agent",
        "created_at": str(raw.get("created_at") or _now_iso()),
        "updated_at": str(raw.get("updated_at") or raw.get("created_at") or _now_iso()),
        "messages": messages,
    }


def find_session_by_platform(channel_id: str, platform_chat_id: str | int) -> dict[str, Any] | None:
    pid = str(platform_chat_id).strip()
    if not pid:
        return None
    for raw in _read_store()["sessions"]:
        record = _normalize_session(raw)
        if record["channel_id"] == channel_id and record.get("platform_chat_id") == pid:
            return record
    return None


def get_or_create_platform_session(
    channel_id: str,
    platform_chat_id: str | int,
    *,
    label: str | None = None,
    platform_chat_title: str | None = None,
    prompt_id: str | None = None,
) -> dict[str, Any]:
    existing = find_session_by_platform(channel_id, platform_chat_id)
    if existing is not None:
        patch: dict[str, Any] = {}
        if prompt_id and existing.get("prompt_id") != prompt_id:
            patch["prompt_id"] = prompt_id
        title = (platform_chat_title or "").strip()
        if title and title != existing.get("platform_chat_title"):
            patch["platform_chat_title"] = title
            patch["label"] = title
        if patch:
            return update_session(existing["id"], patch)
        return enrich_session(existing)
    resolved_label = (platform_chat_title or label or "").strip() or label
    return create_session(
        label=resolved_label,
        prompt_id=prompt_id,
        channel_id=channel_id,
        platform_chat_id=str(platform_chat_id),
        platform_chat_title=(platform_chat_title or "").strip() or None,
    )


def list_sessions(*, channel_id: str | None = None) -> list[dict[str, Any]]:
    sessions = [_normalize_session(s) for s in _read_store()["sessions"]]
    if channel_id:
        sessions = [s for s in sessions if s.get("channel_id") == channel_id]
    sessions.sort(key=lambda s: s.get("updated_at") or "", reverse=True)
    return [enrich_session(s) for s in sessions]


def list_sessions_payload(*, channel_id: str | None = None) -> dict[str, Any]:
    all_sessions = [_normalize_session(s) for s in _read_store()["sessions"]]
    all_sessions.sort(key=lambda s: s.get("updated_at") or "", reverse=True)
    enriched_all = [enrich_session(s) for s in all_sessions]
    items = enriched_all
    if channel_id:
        items = [s for s in enriched_all if s.get("channel_id") == channel_id]
    return {
        "items": items,
        "total": len(items),
        "channels": session_channel_summaries(enriched_all),
    }


def get_session(session_id: str) -> dict[str, Any] | None:
    for raw in _read_store()["sessions"]:
        if str(raw.get("id")) == session_id:
            return enrich_session(_normalize_session(raw))
    return None


def create_session(
    *,
    label: str | None = None,
    prompt_id: str | None = None,
    channel_id: str = PANEL_CHANNEL_ID,
    platform_chat_id: str | None = None,
    platform_chat_title: str | None = None,
) -> dict[str, Any]:
    store = _read_store()
    sessions = store["sessions"]
    now = _now_iso()
    title = (platform_chat_title or "").strip() or None
    record = _normalize_session(
        {
            "id": uuid.uuid4().hex[:12],
            "label": (title or label or DEFAULT_SESSION_LABEL).strip() or DEFAULT_SESSION_LABEL,
            "channel_id": channel_id,
            "platform_chat_id": platform_chat_id,
            "platform_chat_title": title,
            "prompt_id": prompt_id or "gateway_agent",
            "created_at": now,
            "updated_at": now,
            "messages": [],
        }
    )
    sessions.insert(0, record)
    store["sessions"] = sessions[:MAX_SESSIONS]
    _write_store(store)
    return enrich_session(record)


def update_session(session_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    store = _read_store()
    updated: dict[str, Any] | None = None
    for idx, raw in enumerate(store["sessions"]):
        if str(raw.get("id")) != session_id:
            continue
        record = _normalize_session(raw)
        if "label" in patch and patch["label"] is not None:
            record["label"] = str(patch["label"]).strip() or record["label"]
        if "platform_chat_title" in patch and patch["platform_chat_title"] is not None:
            title = str(patch["platform_chat_title"]).strip()
            record["platform_chat_title"] = title or None
            if title:
                record["label"] = title
        if "prompt_id" in patch and patch["prompt_id"] is not None:
            record["prompt_id"] = str(patch["prompt_id"]).strip() or record["prompt_id"]
        record["updated_at"] = _now_iso()
        store["sessions"][idx] = record
        updated = record
        break
    if updated is None:
        raise LookupError("session not found")
    _write_store(store)
    return enrich_session(updated)


def delete_session(session_id: str) -> bool:
    store = _read_store()
    before = len(store["sessions"])
    store["sessions"] = [s for s in store["sessions"] if str(s.get("id")) != session_id]
    if len(store["sessions"]) == before:
        return False
    _write_store(store)
    return True


def _title_from_message(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text.strip())
    if not cleaned:
        return DEFAULT_SESSION_LABEL
    return cleaned[:48] + ("…" if len(cleaned) > 48 else "")


def history_for_llm(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Extract user/assistant text turns for the LLM context window."""
    turns: list[dict[str, str]] = []
    for msg in messages:
        if msg.get("kind") == "session":
            continue
        role = msg.get("role")
        content = str(msg.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        turns.append({"role": role, "content": content})
    return turns[-MAX_HISTORY_MESSAGES:]


def append_turn(
    session_id: str,
    *,
    user_message: str,
    assistant_message: str,
    ok: bool = True,
    tool_calls: list[dict[str, Any]] | None = None,
    model_ref: str | None = None,
    prompt_id: str | None = None,
) -> dict[str, Any]:
    store = _read_store()
    updated: dict[str, Any] | None = None
    now = _now_iso()
    for idx, raw in enumerate(store["sessions"]):
        if str(raw.get("id")) != session_id:
            continue
        record = _normalize_session(raw)
        if prompt_id:
            record["prompt_id"] = prompt_id
        if record["label"] == DEFAULT_SESSION_LABEL:
            record["label"] = _title_from_message(user_message)
        record["messages"].append(
            {
                "role": "user",
                "content": user_message,
                "created_at": now,
            }
        )
        record["messages"].append(
            {
                "role": "assistant",
                "content": assistant_message,
                "created_at": now,
                "ok": ok,
                "tool_calls": tool_calls or [],
                "model_ref": model_ref,
            }
        )
        record["updated_at"] = now
        store["sessions"][idx] = record
        updated = record
        break
    if updated is None:
        raise LookupError("session not found")
    _write_store(store)
    return enrich_session(updated)
