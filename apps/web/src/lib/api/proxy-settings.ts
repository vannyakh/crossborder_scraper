import { api } from './client'

export type ProxyMode = 'direct' | 'single' | 'pool' | 'vpn'

export type ProxyStatus = {
  mode: ProxyMode
  pool_size: number
  rotation: string
  vpn_enabled: boolean
  vpn_mode: string
  proxy_server_set: boolean
  proxy_list_path: string | null
  list_exists: boolean
  list_count: number
  vpn_endpoint_set: boolean
  vpn_config_path: string | null
}

export type ProxyTestResult = {
  ok: boolean
  message: string
  direct_ip: string | null
  exit_ip: string | null
  proxied: boolean
  mode: ProxyMode
}

export function fetchProxyStatus(): Promise<ProxyStatus> {
  return api<ProxyStatus>('/config/proxy/status')
}

export function testProxyEgress(): Promise<ProxyTestResult> {
  return api<ProxyTestResult>('/config/proxy/test', { method: 'POST' })
}
