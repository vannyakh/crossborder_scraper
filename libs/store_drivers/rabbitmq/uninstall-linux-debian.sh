#!/usr/bin/env bash
set -euo pipefail
systemctl stop rabbitmq-server 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y -qq rabbitmq-server 2>/dev/null || true
echo "RabbitMQ driver removed"
