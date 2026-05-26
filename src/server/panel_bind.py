"""Backward-compatible re-exports — prefer server.core.panel_bind."""

from server.core.panel_bind import PanelBindInfo, configure_panel_bind, get_panel_bind_info

__all__ = ["PanelBindInfo", "configure_panel_bind", "get_panel_bind_info"]
