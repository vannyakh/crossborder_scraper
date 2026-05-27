"""Gateway agent rules — behavior control via RULE.md packages."""

from gateway.rules.manager import RuleManager, get_rule_manager
from gateway.rules.manifest import RuleManifest, parse_rule_md

__all__ = [
    "RuleManager",
    "RuleManifest",
    "get_rule_manager",
    "parse_rule_md",
]
