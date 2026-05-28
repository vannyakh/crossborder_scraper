"""Gateway chat sessions and prompt labels."""

from gateway.chat_sessions import (
    append_turn,
    create_session,
    delete_session,
    get_session,
    history_for_llm,
)
from gateway.prompts import list_prompts


def test_prompt_labels_are_distinct() -> None:
    items = list_prompts()
    labels = [str(i["label"]) for i in items]
    assert "gateway_agent" in [i["id"] for i in items]
    gateway = next(i for i in items if i["id"] == "gateway_agent")
    assert gateway["kind"] == "role"
    assert gateway["label"] != "Task"
    assert len(set(labels)) == len(labels)


def test_chat_session_round_trip(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "gateway.chat_sessions.chat_sessions_path",
        lambda: tmp_path / "agent_chat_sessions.json",
    )
    session = create_session(prompt_id="gateway_agent")
    sid = session["id"]
    append_turn(
        sid,
        user_message="List recent batches",
        assistant_message="Found 2 batches.",
        ok=True,
    )
    loaded = get_session(sid)
    assert loaded is not None
    assert loaded["label"] == "List recent batches"
    assert len(loaded["messages"]) == 2
    history = history_for_llm(loaded["messages"])
    assert history == [
        {"role": "user", "content": "List recent batches"},
        {"role": "assistant", "content": "Found 2 batches."},
    ]
    assert delete_session(sid)
    assert get_session(sid) is None
