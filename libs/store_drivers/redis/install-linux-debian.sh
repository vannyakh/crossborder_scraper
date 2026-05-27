#!/usr/bin/env bash
# Native Redis driver — Debian/Ubuntu (apt).
set -euo pipefail
: "${PORT:=6379}"
: "${PASSWORD:=}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq redis-server
CONF=/etc/redis/redis.conf
if [ -f "$CONF" ]; then
  sed -i "s/^port .*/port ${PORT}/" "$CONF" || true
  sed -i "s/^bind .*/bind 127.0.0.1 ::1/" "$CONF" || true
  if [ -n "$PASSWORD" ]; then
    if grep -q "^requirepass" "$CONF"; then
      sed -i "s/^requirepass .*/requirepass ${PASSWORD}/" "$CONF"
    else
      echo "requirepass ${PASSWORD}" >> "$CONF"
    fi
  fi
fi
systemctl enable --now redis-server
systemctl restart redis-server
echo "Redis installed on port ${PORT}"
