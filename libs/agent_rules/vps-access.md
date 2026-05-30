---
name: VPS and panel access
description: Self-host install, nginx proxy, HTTPS, and layered firewall troubleshooting.
category: panel
priority: 25
---

## Access layers

When the panel URL times out or refuses connection, check in order:

1. **Panel bind** — `PANEL_HOST=0.0.0.0`; panel listening on the panel port (default **8787**).
2. **Host firewall** — ufw/firewalld allows the panel port and/or **80** / **443** when nginx is fronting the panel.
3. **Cloud security group** — inbound TCP in the cloud console must match what is exposed (ufw open but cloud blocked is common).

Call `network_access_status` before diagnosing. Never invent bind addresses, public IPs, or firewall state.

## Public access patterns

- **Domain + HTTPS** — `crossborder deploy https -n panel.example.com` or `sudo bash scripts/deploy-https.sh …`. nginx on **443**; panel stays on **127.0.0.1:8787**. Requires DNS A record and cloud SG **80** + **443**.
- **Public IP only** — nginx on **port 80** proxying to the panel: `http://<public-ip>/ui/login`. Let's Encrypt needs a domain; do not promise TLS on a bare IP.
- **Direct panel port** — `http://<public-ip>:8787/ui/login` only when host and cloud SG both allow **8787**.

## Install reminders

- One-liner: `curl -fsSL …/scripts/install.sh | bash`
- wwwroot layout when `/www/wwwroot` exists, or `CROSSBORDER_VPS=1`
- Full guide: `docs/SELF_HOSTING.md`

## Mutations and ground truth

- Confirm before `setup_network_access` or `apply_panel_firewall` — they change live VPS access.
- If bind and host firewall look OK but the URL still times out, the cloud security group is the likely fix — give TCP port steps, not guesses.
- Do not repeat panel passwords or `.env` secrets in chat.
