#!/usr/bin/env bash
set -euo pipefail
: "${VERSION:=3.13}"
: "${PORT:=5672}"
: "${PASSWORD:=panel}"
: "${USERNAME:=panel}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq rabbitmq-server
rabbitmqctl add_user "${USERNAME}" "${PASSWORD}" 2>/dev/null || rabbitmqctl change_password "${USERNAME}" "${PASSWORD}"
rabbitmqctl set_user_tags "${USERNAME}" administrator
rabbitmqctl set_permissions -p / "${USERNAME}" ".*" ".*" ".*"
systemctl enable --now rabbitmq-server
echo "RabbitMQ installed — AMQP port ${PORT}"
