"""Database platform driver contract."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class EngineRuntimeContext:
    plugin_id: str
    mode: str
    container: str | None
    admin_user: str
    admin_password: str
    config: dict[str, Any]


class DatabasePlatformDriver(Protocol):
    platform_id: str

    def provision_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
        password: str,
        charset: str,
        access: str,
    ) -> None: ...

    def drop_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
    ) -> None: ...
