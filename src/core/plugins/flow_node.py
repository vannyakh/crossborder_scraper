"""Project flow node binding — how a source plugin maps to canvas execution nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from core.plugins.spec import EcommerceScrapeSpec

FlowNodeKind = Literal["scrape", "export", "agent"]
FlowNodeRole = Literal["trigger", "action", "agent", "config"]


@dataclass(frozen=True)
class FlowNodeSpec:
    """Declares how a plugin participates in the project flow canvas."""

    node_kind: FlowNodeKind
    profile_id: str
    role: FlowNodeRole = "action"
    default_options: dict[str, Any] = field(default_factory=dict)
    variable_keys: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "node_kind": self.node_kind,
            "profile_id": self.profile_id,
            "role": self.role,
            "default_options": dict(self.default_options),
            "variable_keys": list(self.variable_keys),
        }

    def seed_node(
        self,
        *,
        node_id: str,
        label: str,
        x: float,
        y: float,
        subtitle: str | None = None,
        status: str = "online",
        extra_options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build a project flow node dict wired to this plugin profile."""
        options = {**self.default_options, **(extra_options or {})}
        plugin_id = str(options.get("plugin_id") or self.profile_id.removeprefix("scraper-"))
        row: dict[str, Any] = {
            "id": node_id,
            "kind": self.node_kind,
            "role": self.role,
            "label": label,
            "x": x,
            "y": y,
            "status": status,
            "pluginId": plugin_id,
            "pluginProfile": self.profile_id,
            "options": {**options, "plugin_id": plugin_id},
        }
        if subtitle:
            row["subtitle"] = subtitle
        return row

    @classmethod
    def for_scrape_source(
        cls,
        *,
        plugin_id: str,
        scrape_spec: EcommerceScrapeSpec,
    ) -> FlowNodeSpec:
        data_fields = ", ".join(str(item) for item in scrape_spec.data_fields[:8])
        caps = scrape_spec.capabilities
        return cls(
            node_kind="scrape",
            profile_id=f"scraper-{plugin_id}",
            role="action",
            default_options={
                "plugin_id": plugin_id,
                "data_fields": data_fields,
                "ai_extraction": bool(caps.supports_ai_extraction),
                "batch_mode": bool(caps.supports_batch),
            },
            variable_keys=("SCRAPE_PROXY_URL", "MARKETPLACE_COOKIE"),
        )


def resolve_flow_node(
    module,
    *,
    plugin_id: str,
    scrape_spec: EcommerceScrapeSpec | None,
) -> FlowNodeSpec | None:
    explicit = getattr(module, "FLOW_NODE", None)
    if isinstance(explicit, FlowNodeSpec):
        return explicit
    if scrape_spec is not None:
        return FlowNodeSpec.for_scrape_source(plugin_id=plugin_id, scrape_spec=scrape_spec)
    return None
