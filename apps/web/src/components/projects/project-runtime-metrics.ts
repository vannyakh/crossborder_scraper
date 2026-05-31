import type { ProjectRuntimeMetricsBlock } from '../../lib/api/types'

export type RuntimeMetricId = 'cpu' | 'memory' | 'network' | 'disk'

export type RuntimeServiceSeries = {
  id: string
  name: string
  color: string
  values: number[]
}

export type ProjectRuntimeMetrics = {
  labels: string[]
  cpu: RuntimeServiceSeries[]
  memory: RuntimeServiceSeries[]
  network: RuntimeServiceSeries[]
  disk: RuntimeServiceSeries[]
}

export function mapProjectRuntimeMetrics(block: ProjectRuntimeMetricsBlock): ProjectRuntimeMetrics {
  return {
    labels: block.labels,
    cpu: block.cpu,
    memory: block.memory,
    network: block.network,
    disk: block.disk,
  }
}

export function formatRuntimeY(metric: RuntimeMetricId, value: number): string {
  switch (metric) {
    case 'cpu':
      return value === 0 ? '0.0' : value.toFixed(1)
    case 'memory':
      if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`
      if (value >= 1) return `${Math.round(value)} MB`
      return `${Math.round(value * 1024)} B`
    case 'network':
      if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`
      return `${value.toFixed(value >= 10 ? 0 : 1)} MB`
    case 'disk':
      if (value >= 1) return `${value.toFixed(2)} GB`
      if (value >= 0.001) return `${Math.round(value * 1024)} MB`
      return '0 B'
    default:
      return String(value)
  }
}

export const RUNTIME_METRIC_Y_MAX: Record<RuntimeMetricId, number | undefined> = {
  cpu: 0.4,
  memory: 600,
  network: 12,
  disk: 1.05,
}
