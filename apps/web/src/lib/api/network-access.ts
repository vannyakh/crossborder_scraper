import { api } from './client'

export type NetworkAccessCheck = {
  id: string
  label: string
  ok: boolean | null
  detail: string
}

export type HostFirewallStatus = {
  installed: boolean
  active: boolean
  port_allowed: boolean
  ssh_allowed?: boolean
  summary: string
}

export type CloudSecurityRule = {
  direction: string
  protocol: string
  port: string
  source: string
  action: string
  description: string
}

export type NetworkAccessStatus = {
  port: number
  bind_host: string
  external_host: string | null
  listening: string[]
  public_bind: boolean
  local_health: boolean
  ufw: HostFirewallStatus
  firewalld: HostFirewallStatus
  cloud_rule: CloudSecurityRule
  cloud_steps: string[]
  checks: NetworkAccessCheck[]
  login_urls: Record<string, string | null>
  can_manage_host_firewall: boolean
  platform: string
}

export type NetworkAccessApplyResponse = {
  ok: boolean
  messages: string[]
  status: NetworkAccessStatus
}

export type NetworkAccessSetupResponse = NetworkAccessApplyResponse & {
  restart_required: boolean
}

export function fetchNetworkAccess() {
  return api<NetworkAccessStatus>('/deploy/network')
}

export function applyHostFirewall(body?: { enable_ufw?: boolean; port?: number }) {
  return api<NetworkAccessApplyResponse>('/deploy/network/firewall', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export function setupNetworkAccess(body?: {
  ensure_bind?: boolean
  enable_ufw?: boolean
  open_firewall?: boolean
  persist_external?: boolean
}) {
  return api<NetworkAccessSetupResponse>('/deploy/network/setup', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}
