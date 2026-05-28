"""CLI smoke tests for agent hub commands."""

from __future__ import annotations

from typer.testing import CliRunner

from cli.app import app

runner = CliRunner()


def test_cli_help_lists_agent_commands() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "chat" in result.stdout
    assert "service" in result.stdout
    assert "discover" in result.stdout
    assert "rules" in result.stdout


def test_skills_disable_local(tmp_path, monkeypatch) -> None:
    builtin = tmp_path / "skills"
    installed = tmp_path / "installed_skills"
    config = tmp_path / "agent_skills.yaml"
    builtin.mkdir()
    installed.mkdir()
    for sid in ("a", "b"):
        (builtin / sid).mkdir()
        (builtin / sid / "SKILL.md").write_text(
            f"---\nname: {sid}\ndescription: x\nmetadata:\n  crossborder:\n    tools: []\n---\n",
            encoding="utf-8",
        )
    config.write_text("enabled:\n  - a\n  - b\n", encoding="utf-8")

    from gateway.skills.manager import SkillManager

    mgr = SkillManager()
    mgr.builtin_dir = builtin
    mgr.installed_root = installed
    mgr.config_path = config
    monkeypatch.setattr("gateway.skills.manager._manager", mgr)
    monkeypatch.setattr("gateway.skills.get_skill_manager", lambda: mgr)

    result = runner.invoke(app, ["skills", "disable", "b", "--local"])
    assert result.exit_code == 0
    assert "a" in result.stdout
    assert mgr.enabled_ids() == {"a"}


def test_gateway_client_agent_run_session_field() -> None:
    from gateway.client import GatewayClient

    client = GatewayClient("http://127.0.0.1:8787")
    captured: dict = {}

    def fake_request(method, path, *, body=None, auth=True):
        captured["body"] = body
        return {"ok": True, "message": "hi", "session_id": "abc123"}

    client._request = fake_request  # type: ignore[method-assign]
    out = client.agent_run("ping", session_id="sess1", prompt_id="gateway_agent")
    assert captured["body"]["session_id"] == "sess1"
    assert out["session_id"] == "abc123"
