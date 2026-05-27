#!/usr/bin/env bash
set -euo pipefail
systemctl stop mongod 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq mongodb-org* 2>/dev/null || apt-get remove -y -qq mongodb 2>/dev/null || true
echo "MongoDB driver removed"
