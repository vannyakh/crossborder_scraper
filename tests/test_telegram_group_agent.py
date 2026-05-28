"""Telegram group mention / wake-word detection."""

from __future__ import annotations

from types import SimpleNamespace

from gateway.integrate.runners.telegram.group_agent import (
    extract_agent_message,
    is_group_chat,
    is_message_to_agent,
)


class _FakeBot:
    id = 42
    username = "crossborder_bot"


class _FakeContext:
    bot = _FakeBot()


def _group_update(text: str, *, reply_to_bot: bool = False) -> SimpleNamespace:
    entities = []
    if "@crossborder_bot" in text:
        idx = text.index("@crossborder_bot")
        entities.append(
            SimpleNamespace(
                type="mention",
                offset=idx,
                length=len("@crossborder_bot"),
                user=None,
            )
        )
    reply = None
    if reply_to_bot:
        reply = SimpleNamespace(from_user=SimpleNamespace(id=_FakeBot.id))
    return SimpleNamespace(
        effective_chat=SimpleNamespace(type="supergroup", id=-100123, title="Ops"),
        effective_message=SimpleNamespace(
            text=text,
            caption=None,
            entities=entities,
            caption_entities=[],
            reply_to_message=reply,
        ),
    )


def _dm_update(text: str) -> SimpleNamespace:
    return SimpleNamespace(
        effective_chat=SimpleNamespace(type="private", id=123),
        effective_message=SimpleNamespace(
            text=text,
            caption=None,
            entities=[],
            caption_entities=[],
            reply_to_message=None,
        ),
    )


def test_dm_always_targets_agent() -> None:
    cfg = {"group_require_mention": True}
    assert is_message_to_agent(_dm_update("hello"), _FakeContext(), cfg) is True


def test_group_ignores_unrelated_message() -> None:
    cfg = {"group_require_mention": True, "bot_display_name": "Cross-Border Assistant"}
    update = _group_update("hello everyone")
    assert is_message_to_agent(update, _FakeContext(), cfg) is False


def test_group_accepts_mention() -> None:
    cfg = {"group_require_mention": True}
    update = _group_update("@crossborder_bot check runtime status")
    assert is_message_to_agent(update, _FakeContext(), cfg) is True
    cleaned = extract_agent_message(update.effective_message.text, update, _FakeContext(), cfg)
    assert cleaned == "check runtime status"


def test_group_accepts_reply_to_bot() -> None:
    cfg = {"group_require_mention": True}
    update = _group_update("check status", reply_to_bot=True)
    assert is_message_to_agent(update, _FakeContext(), cfg) is True


def test_group_accepts_wake_name() -> None:
    cfg = {"group_require_mention": True, "agent_wake_names": ["agent"]}
    update = _group_update("agent list schedules")
    assert is_message_to_agent(update, _FakeContext(), cfg) is True
    cleaned = extract_agent_message(update.effective_message.text, update, _FakeContext(), cfg)
    assert cleaned == "list schedules"


def test_is_group_chat() -> None:
    assert is_group_chat(_group_update("x")) is True
    assert is_group_chat(_dm_update("x")) is False
