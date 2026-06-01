#!/usr/bin/env bash
# Native Ollama driver — macOS (Homebrew + brew services).
#
# Requires Homebrew (https://brew.sh). Installs or upgrades Ollama, then
# starts it via launchd through `brew services`. If a custom PORT is given,
# a plist EnvironmentVariables override is written so the service listens on
# that port instead of the default 11434.
set -euo pipefail
: "${PORT:=11434}"

if ! command -v brew &>/dev/null; then
  echo "Homebrew not found. Install it first: https://brew.sh" >&2
  exit 1
fi

echo "Installing Ollama via Homebrew…"
brew install ollama 2>/dev/null || brew upgrade ollama 2>/dev/null || true

if [ "${PORT}" != "11434" ]; then
  PLIST="$(brew --prefix)/opt/ollama/homebrew.mxcl.ollama.plist"
  USER_PLIST="$HOME/Library/LaunchAgents/homebrew.mxcl.ollama.plist"
  TARGET=""
  [ -f "$USER_PLIST" ] && TARGET="$USER_PLIST"
  [ -z "$TARGET" ] && [ -f "$PLIST" ] && cp "$PLIST" "$USER_PLIST" && TARGET="$USER_PLIST"

  if [ -n "$TARGET" ]; then
    /usr/libexec/PlistBuddy -c "Delete :EnvironmentVariables" "$TARGET" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables dict" "$TARGET"
    /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:OLLAMA_HOST string 127.0.0.1:${PORT}" "$TARGET"
    echo "Configured OLLAMA_HOST=127.0.0.1:${PORT} in launch agent plist."
  else
    echo "Warning: could not locate plist; set OLLAMA_HOST=127.0.0.1:${PORT} manually." >&2
  fi
fi

brew services start ollama 2>/dev/null || brew services restart ollama
echo "Ollama installed and started on port ${PORT}."
echo "Run: ollama pull llama3.2  (or choose a model at https://ollama.com/library)"
