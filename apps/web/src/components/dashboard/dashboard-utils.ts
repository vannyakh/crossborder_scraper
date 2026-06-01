// Re-exported from lib/datetime for backward compat — prefer importing from there.
export { formatHostUptime, formatUptime } from '../../lib/datetime'

export function gaugePercent(value: number, cap: number): number {
  if (cap <= 0) return 0
  return Math.min(100, (value / cap) * 100)
}

export function countCookieSessions(sessions: Record<string, string[]> | undefined): number {
  if (!sessions) return 0
  return Object.values(sessions).reduce((n, arr) => n + (arr?.length ?? 0), 0)
}
