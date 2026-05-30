"""Port availability helpers (deploy.network)."""

from __future__ import annotations

import socket

from deploy.network import is_port_free, pick_panel_port


def test_is_port_free_detects_listener() -> None:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.listen(1)
    try:
        assert is_port_free("127.0.0.1", port) is False
        assert is_port_free("0.0.0.0", port) is False
    finally:
        sock.close()


def test_pick_panel_port_skips_busy_preferred() -> None:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    preferred = sock.getsockname()[1]
    sock.listen(1)
    try:
        chosen, adjusted = pick_panel_port(preferred)
        assert adjusted is True
        assert chosen != preferred
        assert is_port_free("127.0.0.1", chosen) is True
    finally:
        sock.close()
