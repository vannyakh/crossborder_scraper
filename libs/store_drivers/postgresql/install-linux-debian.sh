#!/usr/bin/env bash
# Native PostgreSQL driver — Debian/Ubuntu.
set -euo pipefail
: "${VERSION:=16}"
: "${PORT:=5432}"
: "${PASSWORD:=panel}"
: "${USERNAME:=panel}"
: "${DATABASE:=panel}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq "postgresql-${VERSION}" "postgresql-client-${VERSION}" 2>/dev/null \
  || apt-get install -y -qq postgresql postgresql-client
PG_CONF=$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)
if [ -n "$PG_CONF" ]; then
  sed -i "s/^#*port = .*/port = ${PORT}/" "$PG_CONF" || true
  sed -i "s/^port = .*/port = ${PORT}/" "$PG_CONF" || true
fi
systemctl enable --now postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${USERNAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${USERNAME} WITH PASSWORD '${PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DATABASE}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DATABASE} OWNER ${USERNAME};"
sudo -u postgres psql -c "ALTER USER ${USERNAME} WITH PASSWORD '${PASSWORD}';"
systemctl restart postgresql
echo "PostgreSQL ${VERSION} installed on port ${PORT}"
