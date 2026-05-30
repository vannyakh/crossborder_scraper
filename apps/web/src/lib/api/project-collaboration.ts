export type ProjectCollaboratorPeer = {
  clientId: string
  username: string
  selectedNodeId: string | null
}

export type ProjectCollaborationState = {
  clientId: string
  connected: boolean
  reconnecting: boolean
  peers: ProjectCollaboratorPeer[]
  remoteSelections: Record<string, string | null>
  publishSelection: (nodeId: string | null) => void
}

export function getOrCreateCollaborationClientId(): string {
  const key = 'crossborder-project-collab-client'
  try {
    const existing = sessionStorage.getItem(key)
    if (existing && existing.length >= 8) return existing
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    sessionStorage.setItem(key, created)
    return created
  } catch {
    return `c${Date.now().toString(36)}`
  }
}

export function peerAccentColor(clientId: string): string {
  let hash = 0
  for (let i = 0; i < clientId.length; i += 1) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 72% 52%)`
}

export function peerInitials(username: string): string {
  const parts = username.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (username.trim().slice(0, 2) || '?').toUpperCase()
}
