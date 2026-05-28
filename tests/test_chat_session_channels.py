"""Session list enrichment for channel filters."""

from gateway.chat_sessions import (
    create_session,
    enrich_session,
    list_sessions_payload,
    platform_chat_kind,
)


def test_telegram_group_kind(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "gateway.chat_sessions.chat_sessions_path",
        lambda: tmp_path / "agent_chat_sessions.json",
    )
    session = create_session(
        channel_id="telegram",
        platform_chat_id="-100999",
        label="Telegram group · -100999",
    )
    assert platform_chat_kind(session) == "group"
    assert session["message_count"] == 0


def test_list_sessions_payload_channels(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "gateway.chat_sessions.chat_sessions_path",
        lambda: tmp_path / "agent_chat_sessions.json",
    )
    create_session(channel_id="panel")
    create_session(channel_id="telegram", platform_chat_id="123")
    payload = list_sessions_payload()
    assert payload["total"] == 2
    channels = {row["channel_id"]: row["count"] for row in payload["channels"]}
    assert channels["panel"] == 1
    assert channels["telegram"] == 1

    tg_only = list_sessions_payload(channel_id="telegram")
    assert tg_only["total"] == 1
    assert tg_only["items"][0]["channel_id"] == "telegram"
    assert enrich_session(tg_only["items"][0])["platform_chat_kind"] == "direct"
