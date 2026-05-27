"""Gateway HTTP client — CLI and external agents use the same API as the web UI."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GatewayClient:
    """Thin client for the scraper gateway (OpenClaw-style remote control)."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8000",
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

    def agent_run(
        self,
        message: str,
        *,
        prompt_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"message": message}
        if prompt_id:
            body["prompt_id"] = prompt_id
        if skill_ids is not None:
            body["skill_ids"] = skill_ids
        return self._request("POST", "/gateway/agent/run", body=body)

    def run_workflow(self, workflow_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/gateway/workflows/{workflow_id}/run",
            body={"inputs": inputs},
        )

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
            client = cls(base_url or "http://127.0.0.1:8000")
            return client.health().get("status") == "ok"
        except RuntimeError:
            return False
