#!/usr/bin/env bash
# Native Ollama driver — macOS uninstall (Homebrew).
set -euo pipefail

brew services stop ollama 2>/dev/null || true

USER_PLIST="$HOME/Library/LaunchAgents/homebrew.mxcl.ollama.plist"
if [ -f "$USER_PLIST" ]; then
  launchctl unload "$USER_PLIST" 2>/dev/null || true
  rm -f "$USER_PLIST"
fi

brew uninstall ollama 2>/dev/null || true
echo "Ollama removed."
