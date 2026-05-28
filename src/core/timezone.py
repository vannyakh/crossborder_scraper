"""Panel server timezone helpers for cron and display."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

DEFAULT_TIMEZONE = "UTC"

COMMON_TIMEZONES: tuple[str, ...] = (
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Singapore",
    "Asia/Phnom_Penh",
    "Asia/Bangkok",
    "Asia/Tokyo",
    "Australia/Sydney",
)


def validate_timezone(name: str) -> str:
    tz_name = (name or DEFAULT_TIMEZONE).strip()
    if not tz_name:
        tz_name = DEFAULT_TIMEZONE
    try:
        ZoneInfo(tz_name)
    except Exception as exc:
        raise ValueError(
            f"Invalid timezone {name!r}. Use IANA names like UTC or Asia/Phnom_Penh"
        ) from exc
    return tz_name


def get_panel_timezone() -> ZoneInfo:
    from config.server_store import load_server_config

    return ZoneInfo(load_server_config()["timezone"])


def panel_now() -> datetime:
    return datetime.now(get_panel_timezone())


def utc_now_naive() -> datetime:
    """Naive UTC datetime for comparing stored ISO schedule timestamps."""
    return datetime.now(ZoneInfo("UTC")).replace(tzinfo=None)


def format_utc_offset(now: datetime) -> str:
    offset = now.strftime("%z")
    if len(offset) == 5:
        return f"{offset[:3]}:{offset[3:]}"
    return offset or "+00:00"


def timezone_display_name(tz_name: str) -> str:
    return tz_name.replace("_", " ")


def build_timezone_info(tz_name: str | None = None) -> dict[str, str]:
    name = validate_timezone(tz_name or DEFAULT_TIMEZONE)
    tz = ZoneInfo(name)
    now = datetime.now(tz)
    return {
        "timezone": name,
        "label": timezone_display_name(name),
        "local_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "utc_offset": format_utc_offset(now),
    }


def list_timezone_options() -> list[dict[str, str]]:
    return [{"id": tz, "label": timezone_display_name(tz)} for tz in COMMON_TIMEZONES]
