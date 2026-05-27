#!/usr/bin/env bash
# Native MongoDB driver — Debian/Ubuntu (official repo when VERSION is 6/7).
set -euo pipefail
: "${VERSION:=7}"
: "${PORT:=27017}"
: "${PASSWORD:=panel}"
: "${USERNAME:=panel}"
: "${DATABASE:=panel}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq gnupg curl ca-certificates
if [ ! -f /usr/share/keyrings/mongodb-server-${VERSION}.gpg ]; then
  curl -fsSL "https://pgp.mongodb.com/server-${VERSION}.asc" \
    | gpg -o "/usr/share/keyrings/mongodb-server-${VERSION}.gpg" --dearmor
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-${VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${VERSION} multiverse" \
    > /etc/apt/sources.list.d/mongodb-org-${VERSION}.list 2>/dev/null \
    || echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-${VERSION}.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/${VERSION} main" \
    > /etc/apt/sources.list.d/mongodb-org-${VERSION}.list
  apt-get update -qq
fi
apt-get install -y -qq mongodb-org || apt-get install -y -qq mongodb
CFG=/etc/mongod.conf
if [ -f "$CFG" ]; then
  sed -i "s/port:.*/port: ${PORT}/" "$CFG" || true
fi
systemctl enable --now mongod
mongosh --eval "db.getSiblingDB('admin').createUser({user:'${USERNAME}',pwd:'${PASSWORD}',roles:[{role:'root',db:'admin'}]})" 2>/dev/null \
  || mongo admin --eval "db.createUser({user:'${USERNAME}',pwd:'${PASSWORD}',roles:['root']})" 2>/dev/null \
  || true
echo "MongoDB ${VERSION} installed on port ${PORT}"
