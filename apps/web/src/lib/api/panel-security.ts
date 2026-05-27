import { api } from './client'
import type { NetworkAccessStatus } from './network-access'

export type PanelSecurityUrls = {
  entrance: string | null
  login: string | null
  local_login: string | null
  bare_host_note: string
}

export type PanelSecurityStatus = {
  security_entrance_enabled: boolean
  entry_path: string | null
  entry_path_display: string | null
  access_key_configured: boolean
  panel_host: string
  panel_port: number
  external_host: string | null
  panel_username: string | null
  urls: PanelSecurityUrls
  network: NetworkAccessStatus
  restart_required: boolean
}

export type PanelSecurityUpdateBody = {
  external_host?: string | null
  entry_path?: string | null
  regenerate_entry?: boolean
  regenerate_access_key?: boolean
  enable_entrance?: boolean
  username?: string
  password?: string
}

export type PanelSecurityUpdateResponse = {
  ok: boolean
  messages: string[]
  access_key: string | null
  status: PanelSecurityStatus
  restart_required: boolean
}

export function fetchPanelSecurity() {
  return api<PanelSecurityStatus>('/deploy/security')
}

export function updatePanelSecurity(body: PanelSecurityUpdateBody) {
  return api<PanelSecurityUpdateResponse>('/deploy/security', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
