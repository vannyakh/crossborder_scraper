#!/usr/bin/env bash
# Native Ollama driver — official installer (Linux).
set -euo pipefail
: "${PORT:=11434}"

curl -fsSL https://ollama.com/install.sh | sh

if [ "${PORT}" != "11434" ]; then
  mkdir -p /etc/systemd/system/ollama.service.d
  cat > /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=127.0.0.1:${PORT}"
EOF
  systemctl daemon-reload
fi

systemctl enable --now ollama
systemctl restart ollama
echo "Ollama installed on port ${PORT}"
