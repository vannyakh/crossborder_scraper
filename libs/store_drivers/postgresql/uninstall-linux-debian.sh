#!/usr/bin/env bash
set -euo pipefail
systemctl stop postgresql 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq "postgresql-*" 2>/dev/null || apt-get remove -y -qq postgresql 2>/dev/null || true
echo "PostgreSQL driver removed"
