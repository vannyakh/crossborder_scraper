# Network and firewall

Panel port, **host firewall**, and cloud security group checklist for VPS access.

## 1. Confirm bind address

**Settings → Network** shows how the panel listens and the URL to open in a browser.

## 2. Host firewall

**Firewall** page manages ufw rules for the panel port and common services.

## 3. Cloud security group

If the VPS is unreachable from the internet, open the panel port in your cloud provider security group.

## Checklist

| Check | Where |
|-------|--------|
| Panel listening | Settings → Network |
| ufw / firewalld | Firewall page |
| Public port open | Cloud security group console |
