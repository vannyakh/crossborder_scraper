import { api, publicApi } from './client'
import { fetchNetworkAccess, type NetworkAccessStatus } from './network-access'
import type { PanelAccess } from './types'

export type PanelSecurityUrls = {
  entrance: string | null
  login: string | null
  local_login: string | null
  bare_host_note: string
}

export type ServerTimezoneInfo = {
  timezone: string
  label: string
  local_time: string
  utc_offset: string
}

export type TimezoneOption = {
  id: string
  label: string
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
  server_timezone: ServerTimezoneInfo
  timezone_options: TimezoneOption[]
}

export type PanelSecurityUpdateBody = {
  external_host?: string | null
  entry_path?: string | null
  regenerate_entry?: boolean
  regenerate_access_key?: boolean
  enable_entrance?: boolean
  username?: string
  password?: string
  timezone?: string
}

export type PanelSecurityUpdateResponse = {
  ok: boolean
  messages: string[]
  access_key: string | null
  status: PanelSecurityStatus
  restart_required: boolean
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('404')
}

async function fetchPanelSecurityLegacy(): Promise<PanelSecurityStatus> {
  const [network, access] = await Promise.all([
    fetchNetworkAccess(),
    publicApi<PanelAccess>('/panel/access'),
  ])
  const entry = access.entry_path?.trim() || null
  const host = network.external_host ?? access.access_ip
  const port = network.port

  return {
    security_entrance_enabled: Boolean(entry),
    entry_path: entry,
    entry_path_display: entry ? `/${entry}` : null,
    access_key_configured: false,
    panel_host: network.bind_host,
    panel_port: port,
    external_host: network.external_host,
    panel_username: null,
    urls: {
      entrance: access.entrance_url ?? null,
      login: access.panel_url ?? null,
      local_login: null,
      bare_host_note: entry
        ? `http://${host}:${port} returns 404 when security entrance is enabled`
        : `http://${host}:${port}/ui/ — standard panel URL`,
    },
    network,
    restart_required: false,
    server_timezone: {
      timezone: 'UTC',
      label: 'UTC',
      local_time: '',
      utc_offset: '+00:00',
    },
    timezone_options: [{ id: 'UTC', label: 'UTC' }],
  }
}

export async function fetchPanelSecurity(): Promise<PanelSecurityStatus> {
  try {
    return await api<PanelSecurityStatus>('/deploy/security')
  } catch (err) {
    if (!isNotFoundError(err)) throw err
    return fetchPanelSecurityLegacy()
  }
}

export function updatePanelSecurity(body: PanelSecurityUpdateBody) {
  return api<PanelSecurityUpdateResponse>('/deploy/security', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
