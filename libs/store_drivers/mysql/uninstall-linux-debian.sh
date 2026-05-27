#!/usr/bin/env bash
set -euo pipefail
systemctl stop mysql 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq mysql-server 2>/dev/null || true
echo "MySQL driver removed"
