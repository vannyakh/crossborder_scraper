import type { PanelAccess } from './api'

/** Fallback when API is not ready yet. */
export function fallbackPanelAccess(): PanelAccess {
  if (typeof window === 'undefined') {
    return {
      bind_host: '0.0.0.0',
      bind_port: 8000,
      access_ip: '127.0.0.1',
      access_port: 8000,
      panel_path: '/ui/',
      panel_url: 'http://127.0.0.1:8000/ui/',
      copy_text: '127.0.0.1:8000',
      entry_path: null,
      entrance_url: null,
    }
  }
  const port = Number(window.location.port) || 8000
  const ip = window.location.hostname || '127.0.0.1'
  const prefixMatch = window.location.pathname.match(/^\/([a-f0-9]{8})\//)
  const entry = prefixMatch?.[1] ?? null
  const prefix = entry ? `/${entry}` : ''
  return {
    bind_host: '0.0.0.0',
    bind_port: port,
    access_ip: ip,
    access_port: port,
    panel_path: entry ? `${prefix}/ui/` : '/ui/',
    panel_url: `${window.location.protocol}//${window.location.host}${prefix}/ui/`,
    copy_text: entry ? `${ip}:${port}/${entry}` : `${ip}:${port}`,
    entry_path: entry,
    entrance_url: entry
      ? `${window.location.protocol}//${window.location.host}${prefix}/`
      : null,
  }
}

export async function copyPanelAccess(access: PanelAccess): Promise<string> {
  const text = access.copy_text
  await navigator.clipboard.writeText(text)
  return text
}
