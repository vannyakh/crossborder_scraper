import type { ServiceLogEntry } from '../../lib/api/types'
import type { ProjectLogEntry, ProjectLogSeverity } from './project-logs-sample'

function inferSeverity(entry: ServiceLogEntry): ProjectLogSeverity {
  const text = `${entry.details} ${entry.operation_type}`.toLowerCase()
  if (text.includes('fail') || text.includes('error')) {
    return 'error'
  }
  if (text.includes('warn') || text.includes('degraded')) {
    return 'warn'
  }
  return 'info'
}

export function mapServiceLogToProjectLog(entry: ServiceLogEntry): ProjectLogEntry {
  const severity = inferSeverity(entry)
  return {
    id: entry.id,
    at: Date.parse(entry.created_at) || Date.now(),
    service: entry.operation_type || 'panel',
    data: JSON.stringify({
      message: entry.details,
      user: entry.user,
      severity,
    }),
    severity,
  }
}

export function mapServiceLogsToProjectLogs(items: ServiceLogEntry[]): ProjectLogEntry[] {
  return items.map(mapServiceLogToProjectLog).sort((a, b) => a.at - b.at)
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
