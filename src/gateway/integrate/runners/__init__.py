"""Shared runner protocol for integrate channels."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class ChannelRunnerLifecycle(Protocol):
    async def start(self) -> None: ...

    async def stop(self) -> None: ...

    async def reload(self) -> None: ...

    def is_active(self) -> bool: ...
