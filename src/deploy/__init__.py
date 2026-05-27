"""Self-hosting bootstrap and server deployment helpers."""

from deploy.bootstrap import ServerBootstrap, bootstrap_server, run_setup
from deploy.network import PanelAccessInfo, build_panel_access_info
from deploy.panel_access import configure_panel_bind, print_panel_access_card
from deploy.platform import PlatformInfo, detect_platform

__all__ = [
    "PanelAccessInfo",
    "PlatformInfo",
    "ServerBootstrap",
    "bootstrap_server",
    "build_panel_access_info",
    "configure_panel_bind",
    "detect_platform",
    "print_panel_access_card",
    "run_setup",
]
