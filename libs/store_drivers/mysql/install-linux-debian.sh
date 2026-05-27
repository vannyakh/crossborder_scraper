#!/usr/bin/env bash
# Native MySQL driver — Debian/Ubuntu.
set -euo pipefail
: "${VERSION:=8}"
: "${PORT:=3306}"
: "${PASSWORD:=panel}"
: "${USERNAME:=panel}"
: "${DATABASE:=panel}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
debconf-set-selections <<< "mysql-server mysql-server/root_password password ${PASSWORD}"
debconf-set-selections <<< "mysql-server mysql-server/root_password_again password ${PASSWORD}"
apt-get install -y -qq mysql-server
CNF=/etc/mysql/mysql.conf.d/mysqld.cnf
if [ -f "$CNF" ]; then
  sed -i "s/^bind-address.*/bind-address = 127.0.0.1/" "$CNF" || true
  sed -i "s/^port.*/port = ${PORT}/" "$CNF" || true
fi
systemctl enable --now mysql
mysql -uroot -p"${PASSWORD}" -e "CREATE USER IF NOT EXISTS '${USERNAME}'@'localhost' IDENTIFIED BY '${PASSWORD}';" 2>/dev/null \
  || mysql -uroot -e "CREATE USER IF NOT EXISTS '${USERNAME}'@'localhost' IDENTIFIED BY '${PASSWORD}';"
mysql -uroot -p"${PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DATABASE}; GRANT ALL ON ${DATABASE}.* TO '${USERNAME}'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null \
  || mysql -uroot -e "CREATE DATABASE IF NOT EXISTS ${DATABASE}; GRANT ALL ON ${DATABASE}.* TO '${USERNAME}'@'localhost'; FLUSH PRIVILEGES;"
systemctl restart mysql
echo "MySQL installed on port ${PORT}"
