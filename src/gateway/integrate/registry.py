"""Channel registry — maps platform ids to runner modules and config adapters."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from gateway.integrate.catalog import ALL_CHANNEL_IDS, get_catalog_entry

ChannelRunnerKind = Literal["live", "stored"]
ConfigBackend = Literal["telegram", "stored"]

SECRET_KEYS: dict[str, frozenset[str]] = {
    "telegram": frozenset({"bot_token"}),
    "discord": frozenset({"bot_token", "public_key"}),
    "slack": frozenset({"bot_token", "signing_secret", "app_token"}),
    "email": frozenset({"imap_password", "smtp_password"}),
}

# Live runner lifecycle modules (start/stop/reload/is_active).
LIVE_RUNNER_MODULES: dict[str, str] = {
    "telegram": "gateway.integrate.runners.telegram.lifecycle",
}


@dataclass(frozen=True)
class ChannelSpec:
    id: str
    label: str
    description: str
    runner: ChannelRunnerKind
    config_backend: ConfigBackend
    secret_keys: frozenset[str]
    lifecycle_module: str | None


def get_channel_spec(channel_id: str) -> ChannelSpec:
    entry = get_catalog_entry(channel_id)
    if entry is None:
        raise LookupError(f"unknown channel: {channel_id}")
    runner = entry.get("runner") or "stored"
    if runner not in ("live", "stored"):
        runner = "stored"
    config_backend: ConfigBackend = "telegram" if channel_id == "telegram" else "stored"
    return ChannelSpec(
        id=channel_id,
        label=str(entry.get("label") or channel_id),
        description=str(entry.get("description") or ""),
        runner=runner,
        config_backend=config_backend,
        secret_keys=SECRET_KEYS.get(channel_id, frozenset()),
        lifecycle_module=LIVE_RUNNER_MODULES.get(channel_id),
    )


def iter_channel_specs() -> list[ChannelSpec]:
    return [get_channel_spec(channel_id) for channel_id in ALL_CHANNEL_IDS]


def secret_keys_for(channel_id: str) -> frozenset[str]:
    return SECRET_KEYS.get(channel_id, frozenset())
