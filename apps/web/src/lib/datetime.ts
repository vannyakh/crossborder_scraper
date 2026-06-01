/**
 * Shared date / time / duration formatting utilities.
 * Import from here instead of defining local helpers in feature components.
 */

/** Format an ISO datetime string for display — falls back to `"—"` on invalid input. */
export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** Format an ISO date string as a short local date — falls back to `"—"`. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

/**
 * Relative-time string from an ISO timestamp.
 * "just now" · "Nm ago" · "Nh ago" · falls back to local date after 24 h.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return formatIsoDate(iso)
}

/**
 * Duration between two ISO timestamps (or from startedAt to now).
 * Returns `""` when input is missing or negative.
 */
export function formatDurationMs(
  startedAt: string | null | undefined,
  finishedAt?: string | null,
): string {
  if (!startedAt) return ''
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const ms = end - start
  if (Number.isNaN(ms) || ms < 0) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

/** Format integer seconds as `"Xh Ym"` / `"Ym Zs"` / `"Zs"` (e.g. dashboard uptime). */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Human-readable host uptime for the nav tooltip — e.g. `"7 Day(s)"`. */
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

/** First 19 characters of an ISO string — `"YYYY-MM-DDTHH:mm:ss"`. */
export function formatIsoSlice(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 19).replace('T', ' ')
}
