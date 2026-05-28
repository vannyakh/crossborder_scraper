"""Shared pytest configuration and fixtures."""

from __future__ import annotations

import os
from pathlib import Path

# Ensure imports resolve the same way as runtime (src/ on PYTHONPATH).
_ROOT = Path(__file__).resolve().parents[1]
_SRC = _ROOT / "src"
if str(_SRC) not in os.environ.get("PYTHONPATH", "").split(os.pathsep):
    os.environ["PYTHONPATH"] = f"{_SRC}{os.pathsep}{os.environ.get('PYTHONPATH', '')}".rstrip(
        os.pathsep
    )
