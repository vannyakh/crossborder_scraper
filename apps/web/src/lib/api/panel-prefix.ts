/** Secret entrance prefix from the current URL (e.g. /a1b2c3d4). */
export function getPanelEntrancePrefix(): string {
  if (typeof window === 'undefined') return ''
  const match = window.location.pathname.match(/^\/([a-f0-9]{8})(?:\/|$)/)
  return match ? `/${match[1]}` : ''
}

export function withPanelPrefix(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const prefix = getPanelEntrancePrefix()
  if (!prefix) return normalized
  return `${prefix}${normalized}`
}
