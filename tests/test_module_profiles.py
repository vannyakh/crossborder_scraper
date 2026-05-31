"""Module profile discovery and enrichment."""

from __future__ import annotations

from server.module_profiles.enrich import enrich_catalog_row
from server.module_profiles.loader import discover_module_profiles, get_module_profile


def test_discover_module_profiles_includes_ollama():
    profiles = discover_module_profiles()
    assert "ollama" in profiles
    assert profiles["ollama"].kind == "store_service"
    assert profiles["ollama"].has_guide


def test_enrich_store_catalog_row():
    row = enrich_catalog_row(
        {
            "id": "ollama",
            "name": "Ollama",
            "description": "Local LLM",
            "category": "ai",
            "tags": [],
        },
        expected_kind="store_service",
    )
    assert row["has_guide"] is True
    assert row["icon"] == "brain"
    assert row["category_label"] == "AI runtime"
    assert "guide_summary" in row


def test_enrich_skill_row():
    row = enrich_catalog_row(
        {
            "id": "scrape-assistant",
            "name": "Scrape assistant",
            "description": "Scrape URLs",
            "category": "scrape",
        },
        expected_kind="skill",
    )
    assert row["has_guide"] is True
    assert row["module_kind"] == "skill"


def test_get_module_profile_detail():
    profile = get_module_profile("redis")
    assert profile is not None
    assert profile.name == "Redis"
    detail = profile.to_detail_dict()
    assert detail["body_md"]
    assert detail["source_path"].endswith("redis.md")


def test_plugin_readme_fallback_when_no_libs_profile():
    from server.module_profiles.loader import _plugin_readme_paths

    readme_paths = _plugin_readme_paths()
    assert any(p.parent.name == "alibaba_1688" for p in readme_paths)

    # libs/module_profiles wins when both exist
    profile = get_module_profile("1688")
    assert profile is not None
    assert profile.source_path == "libs/module_profiles/1688.md"
