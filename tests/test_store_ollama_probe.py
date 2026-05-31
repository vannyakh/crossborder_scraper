"""Ollama store plugin probe."""

from __future__ import annotations

from server.app_store.catalog import get_plugin
from server.app_store.probes import probe_plugin


def test_ollama_probe_unreachable():
    plugin = get_plugin("ollama")
    assert plugin is not None
    result = probe_plugin(plugin, {"host": "127.0.0.1", "port": 59999})
    assert result["ok"] is False
    assert result.get("message")
