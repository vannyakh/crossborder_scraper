/** Host OS uptime — e.g. "7 Day(s)" for nav tooltip */
export function formatHostUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const days = Math.floor(total / 86400)
  if (days >= 1) return `${days} Day(s)`
  const hours = Math.floor(total / 3600)
  if (hours >= 1) return `${hours} Hour(s)`
  const minutes = Math.floor(total / 60)
  if (minutes >= 1) return `${minutes} Minute(s)`
  return '< 1 Minute'
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatStartedAt(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function gaugePercent(value: number, cap: number): number {
  if (cap <= 0) return 0
  return Math.min(100, (value / cap) * 100)
}

export function countCookieSessions(sessions: Record<string, string[]> | undefined): number {
  if (!sessions) return 0
  return Object.values(sessions).reduce((n, arr) => n + (arr?.length ?? 0), 0)
}
