"""Gateway HTTP client — CLI and external agents use the same API as the web UI."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GatewayClient:
    """Thin client for the Cross-Border gateway."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8787",
        *,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        auth: bool = True,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        req = Request(url, data=data, headers=headers, method=method)
        if auth and self.username and self.password:
            import base64

            token = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            req.add_header("Authorization", f"Basic {token}")
        try:
            with urlopen(req, timeout=120) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            detail = exc.read().decode()
            raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Gateway unreachable at {self.base_url}: {exc}") from exc

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/health", auth=False)

    def status(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/status")

    def list_tools(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/tools")

    def list_workflows(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/workflows")

    def list_prompts(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/prompts")

    def list_skills(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/skills")

    def set_enabled_skills(self, skill_ids: list[str]) -> dict[str, Any]:
        return self._request("PUT", "/gateway/skills/enabled", body={"enabled": skill_ids})

    def list_rules(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/rules")

    def set_enabled_rules(self, rule_ids: list[str]) -> dict[str, Any]:
        return self._request("PUT", "/gateway/rules/enabled", body={"enabled": rule_ids})

    def get_rule(self, rule_id: str) -> dict[str, Any]:
        return self._request("GET", f"/gateway/rules/{rule_id}")

    def list_chat_sessions(self, *, channel_id: str | None = None) -> dict[str, Any]:
        path = "/gateway/chat/sessions"
        if channel_id:
            path = f"{path}?channel_id={channel_id}"
        return self._request("GET", path)

    def create_chat_session(
        self,
        *,
        label: str | None = None,
        prompt_id: str | None = None,
        channel_id: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if label:
            body["label"] = label
        if prompt_id:
            body["prompt_id"] = prompt_id
        if channel_id:
            body["channel_id"] = channel_id
        return self._request("POST", "/gateway/chat/sessions", body=body)

    def get_chat_session(self, session_id: str) -> dict[str, Any]:
        return self._request("GET", f"/gateway/chat/sessions/{session_id}")

    def delete_chat_session(self, session_id: str) -> dict[str, Any]:
        return self._request("DELETE", f"/gateway/chat/sessions/{session_id}")

    def list_channels(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/channels")

    def get_channel(self, channel_id: str) -> dict[str, Any]:
        return self._request("GET", f"/gateway/channels/{channel_id}")

    def configure_channel(self, channel_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "PATCH",
            f"/gateway/channels/{channel_id}",
            body={"updates": updates},
        )

    def reload_channel(self, channel_id: str) -> dict[str, Any]:
        return self._request("POST", f"/gateway/channels/{channel_id}/reload")

    def get_telegram(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/telegram")

    def update_telegram(self, updates: dict[str, Any]) -> dict[str, Any]:
        return self._request("PATCH", "/gateway/telegram", body=updates)

    def agent_run(
        self,
        message: str,
        *,
        prompt_id: str | None = None,
        session_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"message": message}
        if prompt_id:
            body["prompt_id"] = prompt_id
        if session_id:
            body["session_id"] = session_id
        if skill_ids is not None:
            body["skill_ids"] = skill_ids
        return self._request("POST", "/gateway/agent/run", body=body)

    def run_workflow(self, workflow_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/gateway/workflows/{workflow_id}/run",
            body={"inputs": inputs},
        )

    def list_schedules(self) -> dict[str, Any]:
        return self._request("GET", "/gateway/schedules")

    def create_schedule(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/gateway/schedules", body=body)

    def update_schedule(self, schedule_id: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("PATCH", f"/gateway/schedules/{schedule_id}", body=body)

    def delete_schedule(self, schedule_id: str) -> dict[str, Any]:
        return self._request("DELETE", f"/gateway/schedules/{schedule_id}")

    def run_schedule(self, schedule_id: str) -> dict[str, Any]:
        return self._request("POST", f"/gateway/schedules/{schedule_id}/run")

    def list_runs(self, *, limit: int = 30) -> dict[str, Any]:
        return self._request("GET", f"/gateway/runs?limit={limit}")

    @classmethod
    def from_env(cls, base_url: str | None = None) -> GatewayClient:
        from config import get_settings

        settings = get_settings()
        host = settings.panel_host
        if host in ("0.0.0.0", "::"):
            host = "127.0.0.1"
        default_url = f"http://{host}:{settings.panel_port}"
        return cls(
            base_url or default_url,
            username=settings.panel_username,
            password=settings.panel_password,
        )

    @classmethod
    def probe(cls, base_url: str | None = None) -> bool:
        try:
            from deploy.network import DEFAULT_PANEL_PORT

            client = cls(base_url or f"http://127.0.0.1:{DEFAULT_PANEL_PORT}")
            return client.health().get("status") == "ok"
        except RuntimeError:
            return False
