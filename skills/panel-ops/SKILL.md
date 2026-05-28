---
name: panel-ops
description: "Diagnose panel health, VPS network access, host firewall, and agent rules from chat."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🛡️"
    category: panel
    tools:
      - runtime_status
      - network_access_status
      - setup_network_access
      - apply_panel_firewall
      - list_firewall_rules
      - list_agent_rules
---

# Panel operations

Use when the operator asks about **panel access**, **VPS firewall**, **health checks**, or **why the panel is unreachable**.

## When to use

- "Can't open the panel URL", "port blocked", "firewall", "ufw"
- "Is the engine healthy?", "what's running?", readiness / Support-style checks
- "What agent rules are enabled?"

## Network access workflow

1. `network_access_status` — bind address, panel port, ufw/firewalld state, cloud security group hints.
2. Summarize in three bullets: **listen URL**, **host firewall**, **cloud security group**.
3. If the host firewall blocks the panel port, ask before mutating:
   - `apply_panel_firewall` — open panel TCP port only (needs root/sudo on VPS).
   - `setup_network_access` — bind `0.0.0.0`, open firewall, detect public IP in `.env` (full setup).

## Health workflow

1. `runtime_status` — engine uptime, running batches, AI/agent flags, limits.
2. Report only fields present in `result`; flag active batches or recent failures.
3. If agent chat fails, note LLM readiness from `runtime_status` — point to **Settings → Agent LLM**.

## Firewall review

- `list_firewall_rules` before suggesting new rules — cite existing allow/deny rows from tool output.
- Do not repeat raw sudo passwords or `.env` secrets.

## Agent rules

- `list_agent_rules` when asked what behavior policies are active.
- Summarize id, enabled state, and one-line purpose per rule from tool output.

## Safety

- **Confirm** before `apply_panel_firewall` or `setup_network_access` — both change live VPS access.
- Never claim the port is open or firewall applied without `ok: true` from the tool.
- If tools require root and fail, explain sudo/VPS console steps and **Settings → Network** in the panel.
- Remind about **cloud security group** when bind + host firewall look OK but URL still times out.

## Ground truth

- Call `network_access_status` or `runtime_status` before answering access or health questions.
- Do not invent public IPs, ufw status, or rule lists — use tool `result` only.
