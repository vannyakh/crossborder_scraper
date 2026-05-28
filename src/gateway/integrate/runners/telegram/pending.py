"""Pending agent requests awaiting inline-button confirmation."""

from __future__ import annotations

import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class PendingAgentRequest:
    token: str
    chat_id: int
    user_id: int
    text: str
    prompt_id: str
    platform_chat_title: str | None = None


class PendingAgentStore:
    def __init__(self) -> None:
        self._by_token: dict[str, PendingAgentRequest] = {}
        self._token_by_chat: dict[int, str] = {}

    def put(
        self,
        *,
        chat_id: int,
        user_id: int,
        text: str,
        prompt_id: str,
        platform_chat_title: str | None = None,
    ) -> PendingAgentRequest:
        old = self._token_by_chat.get(chat_id)
        if old:
            self._by_token.pop(old, None)
        token = uuid.uuid4().hex[:10]
        req = PendingAgentRequest(
            token=token,
            chat_id=chat_id,
            user_id=user_id,
            text=text,
            prompt_id=prompt_id,
            platform_chat_title=platform_chat_title,
        )
        self._by_token[token] = req
        self._token_by_chat[chat_id] = token
        return req

    def pop(self, token: str) -> PendingAgentRequest | None:
        req = self._by_token.pop(token, None)
        if req is None:
            return None
        if self._token_by_chat.get(req.chat_id) == token:
            self._token_by_chat.pop(req.chat_id, None)
        return req

    def get(self, token: str) -> PendingAgentRequest | None:
        return self._by_token.get(token)


pending_agent = PendingAgentStore()
