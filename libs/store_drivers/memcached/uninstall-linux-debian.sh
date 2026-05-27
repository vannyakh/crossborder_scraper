#!/usr/bin/env bash
set -euo pipefail
systemctl stop memcached 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq memcached 2>/dev/null || true
echo "Memcached driver removed"
