import type { RuntimeMetricId, RuntimeServiceSeries } from './project-runtime-metrics'
import { formatRuntimeY } from './project-runtime-metrics'
import type { ProjectLogEntry, ProjectLogSeverity } from './project-logs-sample'

export const METRIC_UNIT_KEYS: Record<RuntimeMetricId, string> = {
  cpu: 'projects.runtime.units.cpu',
  memory: 'projects.runtime.units.memory',
  network: 'projects.runtime.units.network',
  disk: 'projects.runtime.units.disk',
}

export function peakAcrossSeries(series: RuntimeServiceSeries[]): number {
  if (!series.length) return 0
  return Math.max(...series.flatMap((s) => s.values))
}

export function latestAcrossSeries(series: RuntimeServiceSeries[]): number {
  if (!series.length) return 0
  return Math.max(...series.map((s) => s.values[s.values.length - 1] ?? 0))
}

export function formatMetricSnapshot(metric: RuntimeMetricId, value: number): string {
  return formatRuntimeY(metric, value)
}

export function countLogSeverity(entries: ProjectLogEntry[], severity: ProjectLogSeverity): number {
  return entries.filter((e) => e.severity === severity).length
}

export function formatLogPayload(data: string): string {
  try {
    const parsed = JSON.parse(data) as { message?: string; severity?: string }
    if (typeof parsed.message === 'string') return parsed.message
  } catch {
    /* plain text */
  }
  return data
}

export function logSeverityLabelKey(severity: ProjectLogSeverity): string {
  return severity === 'error'
    ? 'projects.logs.severity.error'
    : severity === 'warn'
      ? 'projects.logs.severity.warn'
      : 'projects.logs.severity.info'
}
