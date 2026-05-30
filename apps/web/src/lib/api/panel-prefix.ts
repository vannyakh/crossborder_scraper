/** Secret entrance prefix from the current URL (e.g. /a1b2c3d4). */
function entranceHexFromEnv(): string {
  const raw = (import.meta.env.VITE_PANEL_ENTRY_PATH as string | undefined)?.trim().toLowerCase()
  if (!raw || raw === 'off' || raw === 'false' || raw === 'disabled') return ''
  const hex = raw.replace(/^\//, '')
  return /^[a-f0-9]{8}$/.test(hex) ? hex : ''
}

export function getPanelEntrancePrefix(): string {
  if (typeof window === 'undefined') {
    const hex = entranceHexFromEnv()
    return hex ? `/${hex}` : ''
  }
  const match = window.location.pathname.match(/^\/([a-f0-9]{8})(?:\/|$)/)
  if (match) return `/${match[1]}`
  const hex = entranceHexFromEnv()
  return hex ? `/${hex}` : ''
}

/** React Router basename — URL entrance only (Vite dev uses base /ui/ without prefix in path). */
export function getRouterBasename(): string {
  if (typeof window === 'undefined') return '/ui'
  const match = window.location.pathname.match(/^\/([a-f0-9]{8})(?:\/|$)/)
  const prefix = match ? `/${match[1]}` : ''
  return prefix ? `${prefix}/ui` : '/ui'
}

export function withPanelPrefix(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const prefix = getPanelEntrancePrefix()
  if (!prefix) return normalized
  return `${prefix}${normalized}`
}
