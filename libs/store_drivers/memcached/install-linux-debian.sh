#!/usr/bin/env bash
set -euo pipefail
: "${PORT:=11211}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq memcached
CFG=/etc/memcached.conf
if [ -f "$CFG" ]; then
  sed -i "s/^-p .*/-p ${PORT}/" "$CFG" || true
  sed -i "s/^-l .*/-l 127.0.0.1/" "$CFG" || true
fi
systemctl enable --now memcached
systemctl restart memcached
echo "Memcached installed on port ${PORT}"
