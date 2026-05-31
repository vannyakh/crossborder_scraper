import type { LogCategory, ServiceLogEntry } from '../../lib/api/types'
import type { ProjectLogEntry, ProjectLogSeverity } from './project-logs-sample'

function normalizeSeverity(value: unknown): ProjectLogSeverity | null {
  if (value === 'error' || value === 'warn' || value === 'info') return value
  if (value === 'debug' || value === 'success') return value
  return null
}

function inferSeverity(entry: ServiceLogEntry): ProjectLogSeverity {
  const metaLevel = normalizeSeverity(entry.meta?.level)
  if (metaLevel) return metaLevel

  const text = `${entry.details} ${entry.operation_type}`.toLowerCase()
  if (text.includes('fail') || text.includes('error')) {
    return 'error'
  }
  if (text.includes('warn') || text.includes('degraded')) {
    return 'warn'
  }
  return 'info'
}

export function mapServiceLogToProjectLog(
  entry: ServiceLogEntry,
  category?: LogCategory,
): ProjectLogEntry {
  const severity = inferSeverity(entry)
  const nodeLabel = typeof entry.meta?.node_label === 'string' ? entry.meta.node_label : undefined
  const nodeId = typeof entry.meta?.node_id === 'string' ? entry.meta.node_id : undefined
  const service =
    category === 'runtime'
      ? nodeLabel || nodeId || entry.operation_type || 'workflow'
      : entry.operation_type || 'panel'

  return {
    id: entry.id,
    at: Date.parse(entry.created_at) || Date.now(),
    service,
    data: JSON.stringify({
      message: entry.details,
      user: entry.user,
      severity,
      nodeId,
      nodeLabel,
      runId: entry.meta?.run_id,
    }),
    severity,
  }
}

export function mapServiceLogsToProjectLogs(
  items: ServiceLogEntry[],
  category?: LogCategory,
): ProjectLogEntry[] {
  return items
    .map((entry) => mapServiceLogToProjectLog(entry, category))
    .sort((a, b) => a.at - b.at)
}

export function projectLogsTimezoneLabel(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')
    return parts?.value?.replace('GMT', 'UTC') ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

export function sinceIsoForLogRange(rangeMs: number): string {
  return new Date(Date.now() - rangeMs).toISOString()
}
