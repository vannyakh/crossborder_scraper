#!/usr/bin/env bash
set -euo pipefail
systemctl stop redis-server 2>/dev/null || true
systemctl disable redis-server 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq redis-server 2>/dev/null || true
echo "Redis driver removed"
