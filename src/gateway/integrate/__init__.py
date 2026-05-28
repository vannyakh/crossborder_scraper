"""Integrate messaging channels — catalog, config, and platform runners for the gateway agent.

Add a new platform:
1. Extend ``catalog.CHANNEL_CATALOG`` with fields and setup steps.
2. Register secret keys in ``registry.SECRET_KEYS`` (stored channels) or a live runner module.
3. For live runners, add ``integrate/runners/<platform>/`` implementing start/stop/reload/is_active.
4. Add ``libs/integrate/<platform>.md`` setup guide and panel nav entry.
"""

from gateway.integrate.catalog import ALL_CHANNEL_IDS, CHANNEL_CATALOG, get_catalog_entry
from gateway.integrate.lifecycle import (
    reload_all_channels,
    reload_channel,
    start_all_channels,
    stop_all_channels,
)
from gateway.integrate.registry import ChannelSpec, get_channel_spec, iter_channel_specs
from gateway.integrate.setup import (
    channel_status,
    configure_channel,
    enable_channel,
    get_channel,
    list_channels,
)

__all__ = [
    "ALL_CHANNEL_IDS",
    "CHANNEL_CATALOG",
    "ChannelSpec",
    "channel_status",
    "configure_channel",
    "enable_channel",
    "get_catalog_entry",
    "get_channel",
    "get_channel_spec",
    "iter_channel_specs",
    "list_channels",
    "reload_all_channels",
    "reload_channel",
    "start_all_channels",
    "stop_all_channels",
]
