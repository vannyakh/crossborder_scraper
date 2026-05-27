"""OpenClaw-style agent skills for the gateway (SKILL.md + install)."""

from gateway.skills.installer import SkillInstaller, SkillInstallError, get_skill_installer
from gateway.skills.manager import SkillManager, get_skill_manager
from gateway.skills.manifest import SkillManifest, load_skill_file, parse_skill_md

__all__ = [
    "SkillInstallError",
    "SkillInstaller",
    "SkillManifest",
    "SkillManager",
    "get_skill_installer",
    "get_skill_manager",
    "load_skill_file",
    "parse_skill_md",
]
