"""Gateway agent rules — discover, enable, and prompt injection."""

from __future__ import annotations

from pathlib import Path

from gateway.rules.manager import RuleManager
from gateway.rules.manifest import parse_rule_md


def test_parse_rule_md_frontmatter() -> None:
    text = """---
name: Custom safety
description: Extra guardrails.
category: safety
priority: 10
---

Always confirm destructive actions.
"""
    manifest = parse_rule_md(text, rule_id="custom-safety", kind="custom")
    assert manifest.name == "Custom safety"
    assert manifest.category == "safety"
    assert manifest.priority == 10
    assert "destructive" in manifest.body


def test_apply_rules_injects_enabled_sections(tmp_path: Path, monkeypatch) -> None:
    builtin = tmp_path / "builtin"
    custom = tmp_path / "custom"
    config = tmp_path / "agent_rules.yaml"
    builtin.mkdir()
    custom.mkdir()

    (builtin / "safety.md").write_text(
        """---
name: Safety
description: Core safety
category: safety
priority: 1
---
Do not leak secrets.
""",
        encoding="utf-8",
    )
    (builtin / "tools.md").write_text(
        """---
name: Tools
description: Tool use
category: tools
priority: 2
---
Prefer read-only tools first.
""",
        encoding="utf-8",
    )

    monkeypatch.setattr("gateway.rules.manager.builtin_agent_rules_dir", lambda: builtin)
    monkeypatch.setattr("gateway.rules.manager.custom_agent_rules_dir", lambda: custom)
    monkeypatch.setattr("gateway.rules.manager.agent_rules_config_path", lambda: config)

    mgr = RuleManager()
    mgr.set_enabled(["safety"])
    ids, prompt = mgr.apply_rules("Base system prompt.")

    assert ids == ["safety"]
    assert "Base system prompt." in prompt
    assert "## Agent rules" in prompt
    assert "Do not leak secrets." in prompt
    assert "Prefer read-only tools first." not in prompt


def test_create_custom_rule_enables_by_default(tmp_path: Path, monkeypatch) -> None:
    builtin = tmp_path / "builtin"
    custom = tmp_path / "custom"
    config = tmp_path / "agent_rules.yaml"
    builtin.mkdir()
    custom.mkdir()

    monkeypatch.setattr("gateway.rules.manager.builtin_agent_rules_dir", lambda: builtin)
    monkeypatch.setattr("gateway.rules.manager.custom_agent_rules_dir", lambda: custom)
    monkeypatch.setattr("gateway.rules.manager.agent_rules_config_path", lambda: config)

    mgr = RuleManager()
    detail = mgr.create_custom_rule(
        rule_id="my-rule",
        name="My rule",
        description="Test",
        category="behavior",
        body="Be concise.",
    )
    assert detail["id"] == "my-rule"
    assert detail["enabled"] is True
    assert (custom / "my-rule.md").is_file()
    assert "my-rule" in mgr.enabled_ids()
