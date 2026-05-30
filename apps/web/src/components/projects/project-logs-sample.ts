import type { ProjectDetail } from './project-sample-data'
import { projectServiceNames } from './project-mock-data'

export type ProjectLogSeverity = 'info' | 'warn' | 'error'

export type ProjectLogEntry = {
  id: string
  at: number
  service: string
  data: string
  severity: ProjectLogSeverity
}

export type LogHistogramBucket = {
  label: string
  startAt: number
  endAt: number
  info: number
  error: number
}

export type ProjectLogsBundle = {
  entries: ProjectLogEntry[]
  histogram: LogHistogramBucket[]
  timezoneLabel: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatProjectLogTime(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function servicesForProject(project: ProjectDetail): string[] {
  return projectServiceNames(project)
}

function telegramPayload(status: number): string {
  return JSON.stringify({
    message: `HTTP Request: POST https://api.telegram.org/bot***/sendMessage "HTTP/1.1 ${status} OK"`,
    severity: 'info',
  })
}

function dbCheckpointPayload(phase: 'starting' | 'complete'): string {
  return JSON.stringify({
    message:
      phase === 'starting'
        ? 'checkpoint starting: time'
        : 'checkpoint complete: wrote 24 buffers (0.2%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.104 s, sync=0.003 s, total=0.112 s; sync files=6, longest=0.002 s, average=0.001 s; distance=163 kB, estimate=163 kB',
    severity: 'error',
  })
}

export function buildProjectLogs(project: ProjectDetail): ProjectLogsBundle {
  const now = Date.now()
  const services = servicesForProject(project)
  const primary = services[0] ?? 'service'
  const database = services.find((s) => s.toLowerCase().includes('db')) ?? services[1] ?? primary

  const entries: ProjectLogEntry[] = []
  let seq = 0

  const add = (
    offsetMin: number,
    offsetSec: number,
    service: string,
    data: string,
    severity: ProjectLogSeverity,
  ) => {
    const at = now - offsetMin * 60_000 - offsetSec * 1000
    entries.push({
      id: `log-${project.id}-${seq++}`,
      at,
      service,
      data,
      severity,
    })
  }

  for (let m = 14; m >= 0; m -= 1) {
    for (let i = 0; i < 3; i += 1) {
      add(m, 50 - i * 11, primary, telegramPayload(200), 'info')
    }
    if (m === 1) {
      add(m, 21, database, dbCheckpointPayload('starting'), 'error')
      add(m, 21, database, dbCheckpointPayload('complete'), 'error')
    }
    if (m === 4 || m === 9) {
      add(m, 18, database, dbCheckpointPayload('starting'), 'error')
    }
  }

  add(0, 8, primary, telegramPayload(200), 'info')
  add(
    0,
    3,
    services[2] ?? primary,
    JSON.stringify({ message: 'catalog sync idle', severity: 'info' }),
    'info',
  )

  entries.sort((a, b) => a.at - b.at)

  const histogram = buildLogHistogram(entries, '15m', now)

  return {
    entries,
    histogram,
    timezoneLabel: 'GMT+7',
  }
}

const HISTOGRAM_CONFIG: Record<LogTimeRangeId, { buckets: number; bucketMs: number }> = {
  '15m': { buckets: 15, bucketMs: 60_000 },
  '1h': { buckets: 12, bucketMs: 5 * 60_000 },
  '24h': { buckets: 24, bucketMs: 60 * 60_000 },
}

export function buildLogHistogram(
  entries: ProjectLogEntry[],
  range: LogTimeRangeId,
  now = Date.now(),
): LogHistogramBucket[] {
  const span = LOG_TIME_RANGE_MS[range]
  const windowStart = now - span
  const { buckets, bucketMs } = HISTOGRAM_CONFIG[range]

  return Array.from({ length: buckets }, (_, i) => {
    const startAt = windowStart + i * bucketMs
    const endAt = startAt + bucketMs
    const inBucket = entries.filter((e) => e.at >= startAt && e.at < endAt)
    const label =
      range === '24h'
        ? new Date(startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : new Date(startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return {
      label,
      startAt,
      endAt,
      info: inBucket.filter((e) => e.severity !== 'error').length,
      error: inBucket.filter((e) => e.severity === 'error').length,
    }
  })
}

export type LogTimeRangeId = '15m' | '1h' | '24h'

export const LOG_TIME_RANGE_MS: Record<LogTimeRangeId, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
}

export function filterLogsByRange(
  entries: ProjectLogEntry[],
  range: LogTimeRangeId,
): ProjectLogEntry[] {
  const cutoff = Date.now() - LOG_TIME_RANGE_MS[range]
  return entries.filter((e) => e.at >= cutoff)
}

export function filterLogsByQuery(entries: ProjectLogEntry[], query: string): ProjectLogEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(
    (e) => e.service.toLowerCase().includes(q) || e.data.toLowerCase().includes(q),
  )
}

export type LogHistogramBrush = {
  startIndex: number
  endIndex: number
}

export function filterLogsByHistogramBrush(
  entries: ProjectLogEntry[],
  histogram: LogHistogramBucket[],
  brush: LogHistogramBrush,
): ProjectLogEntry[] {
  if (histogram.length === 0) return entries
  const start = Math.max(0, Math.min(brush.startIndex, brush.endIndex))
  const end = Math.min(histogram.length - 1, Math.max(brush.startIndex, brush.endIndex))
  const from = histogram[start]?.startAt
  const to = histogram[end]?.endAt
  if (from === undefined || to === undefined) return entries
  return entries.filter((e) => e.at >= from && e.at < to)
}

export function formatHistogramBrushLabel(
  histogram: LogHistogramBucket[],
  brush: LogHistogramBrush,
): string {
  const start = Math.max(0, Math.min(brush.startIndex, brush.endIndex))
  const end = Math.min(histogram.length - 1, Math.max(brush.startIndex, brush.endIndex))
  const a = histogram[start]?.label ?? '—'
  const b = histogram[end]?.label ?? '—'
  return start === end ? a : `${a} – ${b}`
}
