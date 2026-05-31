#!/usr/bin/env bash
set -euo pipefail
systemctl stop ollama 2>/dev/null || true
systemctl disable ollama 2>/dev/null || true
rm -f /usr/local/bin/ollama
rm -rf /usr/share/ollama /etc/systemd/system/ollama.service.d
systemctl daemon-reload 2>/dev/null || true
echo "Ollama driver removed"
