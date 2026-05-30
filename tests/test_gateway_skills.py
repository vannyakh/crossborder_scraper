"""Gateway agent skill install + registry helpers."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

from gateway.skills.installer import extract_skill_zip, resolve_skill_id
from gateway.skills.manager import SkillManager
from gateway.skills.manifest import parse_skill_md


def _zip_bytes(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


def test_parse_skill_md_openclaw_metadata() -> None:
    text = """---
name: scrape-helper
description: Helps with scraping workflows.
metadata:
  openclaw:
    emoji: "🕸"
    category: scrape
    tools:
      - submit_batch
      - list_products
---

# Body
"""
    manifest = parse_skill_md(text, skill_id="scrape-helper", trusted=False)
    assert manifest.category == "scrape"
    assert manifest.emoji == "🕸"
    assert manifest.tools == ("submit_batch", "list_products")


def test_resolve_skill_id_from_meta_json(tmp_path: Path) -> None:
    workspace = tmp_path / "pkg"
    workspace.mkdir()
    (workspace / "_meta.json").write_text(json.dumps({"slug": "my-skill"}), encoding="utf-8")
    assert resolve_skill_id(workspace) == "my-skill"


def test_resolve_skill_id_prefers_slug_hint(tmp_path: Path) -> None:
    workspace = tmp_path / ".staging"
    workspace.mkdir()
    assert resolve_skill_id(workspace, slug_hint="registry-slug") == "registry-slug"


def test_extract_skill_zip_flat_layout(tmp_path: Path) -> None:
    data = _zip_bytes(
        {
            "SKILL.md": "---\nname: flat\ndescription: test\n---\n",
            "_meta.json": json.dumps({"slug": "flat-skill"}),
        }
    )
    dest = tmp_path / "staging"
    workspace = extract_skill_zip(data, dest)
    assert (workspace / "SKILL.md").is_file()
    assert resolve_skill_id(workspace, slug_hint="flat-skill") == "flat-skill"


def test_compose_instructions_filters_unknown_tools(tmp_path: Path, monkeypatch) -> None:
    builtin = tmp_path / "skills"
    installed = tmp_path / "installed_skills"
    config = tmp_path / "agent_skills.yaml"
    builtin.mkdir()
    installed.mkdir()
    (builtin / "batch-ops").mkdir()
    (builtin / "batch-ops" / "SKILL.md").write_text(
        """---
name: batch-ops
description: batch
metadata:
  crossborder:
    tools: [submit_batch, fake_tool]
---
""",
        encoding="utf-8",
    )
    config.write_text("enabled:\n  - batch-ops\n", encoding="utf-8")

    mgr = SkillManager()
    mgr.builtin_dir = builtin
    mgr.installed_root = installed
    mgr.config_path = config

    _, prompt, tools = mgr.compose_instructions("Base prompt", skill_ids=["batch-ops"])
    assert "batch-ops" in prompt
    assert tools == {"submit_batch"}
    assert "Ground truth (all active skills)" in prompt


def test_panel_ops_skill_includes_network_tools() -> None:
    from gateway.skills import get_skill_manager
    from gateway.skills.manager import _BUILTIN_DEFAULT_ENABLED

    mgr = get_skill_manager()
    manifest = mgr.get_manifest("panel-ops")
    assert manifest is not None
    names = set(manifest.tools)
    assert "network_access_status" in names
    assert "apply_panel_firewall" in names
    assert "list_firewall_rules" in names
    assert "runtime_status" in names
    assert "panel-ops" in _BUILTIN_DEFAULT_ENABLED


def test_vps_access_rule_in_default_enabled() -> None:
    from gateway.rules.manager import _DEFAULT_ENABLED, RuleManager

    assert "vps-access" in _DEFAULT_ENABLED
    mgr = RuleManager()
    manifest = mgr.get_manifest("vps-access")
    assert manifest is not None
    assert "cloud security group" in manifest.body.lower()


def test_grounded_responses_rule_in_default_enabled() -> None:
    from gateway.rules.manager import _DEFAULT_ENABLED, RuleManager

    assert "grounded-responses" in _DEFAULT_ENABLED
    mgr = RuleManager()
    manifest = mgr.get_manifest("grounded-responses")
    assert manifest is not None
    assert "phantom success" in manifest.body.lower() or "ok: true" in manifest.body


def test_set_enabled_ignores_unknown_ids(tmp_path: Path, monkeypatch) -> None:
    builtin = tmp_path / "skills"
    installed = tmp_path / "installed_skills"
    config = tmp_path / "agent_skills.yaml"
    builtin.mkdir()
    installed.mkdir()
    config.write_text("enabled: []\n", encoding="utf-8")

    mgr = SkillManager()
    mgr.builtin_dir = builtin
    mgr.installed_root = installed
    mgr.config_path = config

    enabled = mgr.set_enabled(["missing-skill", "also-missing"])
    assert enabled == []


def test_resolve_registry_slug_from_installed_state(tmp_path: Path) -> None:
    installed = tmp_path / "installed_skills"
    installed.mkdir()
    skill_dir = installed / "custom-id"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: Custom\ndescription: x\n---\n", encoding="utf-8"
    )
    (installed / "installed.json").write_text(
        json.dumps(
            {"skills": {"custom-id": {"slug": "registry-slug", "registry": "https://example.test"}}}
        ),
        encoding="utf-8",
    )

    mgr = SkillManager()
    mgr.builtin_dir = tmp_path / "skills"
    mgr.installed_root = installed
    mgr.config_path = tmp_path / "agent_skills.yaml"

    assert mgr.resolve_registry_slug("registry-slug") == "custom-id"
    assert "registry-slug" in mgr.registry_match_ids()
