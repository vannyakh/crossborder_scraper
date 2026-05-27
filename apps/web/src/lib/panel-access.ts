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
    }
  }
  const port = Number(window.location.port) || 8000
  const ip = window.location.hostname || '127.0.0.1'
  return {
    bind_host: '0.0.0.0',
    bind_port: port,
    access_ip: ip,
    access_port: port,
    panel_path: '/ui/',
    panel_url: `${window.location.protocol}//${window.location.host}/ui/`,
    copy_text: `${ip}:${port}`,
  }
}

export async function copyPanelAccess(access: PanelAccess): Promise<string> {
  const text = access.copy_text
  await navigator.clipboard.writeText(text)
  return text
}
