import type { ProjectDetail } from './project-sample-data'

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

const SERIES_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316']

const TV_CAMTUBE_SERVICES = [
  { id: 'camtube', name: 'CamTube', color: SERIES_COLORS[0] },
  { id: 'cache_db', name: 'cache_db', color: SERIES_COLORS[1] },
  { id: 'db_yt', name: 'DB_YT', color: SERIES_COLORS[2] },
  { id: 'rsync_yt', name: 'Rsync_YT', color: SERIES_COLORS[3] },
  { id: 'camtube_db', name: 'CamTube-DB', color: SERIES_COLORS[4] },
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pseudo(i: number, seed: number): number {
  const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function timeLabels(count: number): string[] {
  const now = Date.now()
  const stepMs = 5 * 60 * 1000
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i) * stepMs
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

function servicesForProject(project: ProjectDetail) {
  if (project.id === 'tv-camtube') return TV_CAMTUBE_SERVICES

  const online = project.nodes.filter((n) => n.status !== 'offline')
  const picked = (online.length ? online : project.nodes).slice(0, 5)
  return picked.map((node, index) => ({
    id: node.id,
    name: node.subtitle?.split(':').pop()?.trim() || node.label,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }))
}

function cpuSeries(
  seed: number,
  services: typeof TV_CAMTUBE_SERVICES,
  count: number,
): RuntimeServiceSeries[] {
  return services.map((svc, sIdx) => ({
    ...svc,
    values: Array.from({ length: count }, (_, i) => {
      const base = 0.05 + sIdx * 0.04
      const wave = pseudo(i, seed + sIdx) * 0.12
      return Math.round((base + wave) * 100) / 100
    }),
  }))
}

function memorySeries(
  seed: number,
  services: typeof TV_CAMTUBE_SERVICES,
  count: number,
): RuntimeServiceSeries[] {
  return services.map((svc, sIdx) => {
    const isMain = svc.id === 'camtube' || sIdx === 0
    const isFlatHigh = svc.id === 'rsync_yt'
    return {
      ...svc,
      values: Array.from({ length: count }, (_, i) => {
        if (isFlatHigh) return 600
        if (isMain) {
          const step = Math.floor(i / 4) % 2 === 0 ? 280 : 520
          return step + Math.round(pseudo(i, seed) * 40)
        }
        return 40 + sIdx * 18 + Math.round(pseudo(i, seed + sIdx) * 12)
      }),
    }
  })
}

function networkSeries(
  seed: number,
  services: typeof TV_CAMTUBE_SERVICES,
  count: number,
): RuntimeServiceSeries[] {
  return services.map((svc, sIdx) => ({
    ...svc,
    values: Array.from({ length: count }, (_, i) => {
      const spike = svc.id === 'rsync_yt' && (i === 8 || i === 15)
      if (spike) return 12 + pseudo(i, seed) * 2
      if (svc.id === 'camtube' && (i === 8 || i === 15)) return 4 + pseudo(i, seed) * 1.5
      return Math.round(pseudo(i, seed + sIdx) * 180) / 100
    }),
  }))
}

function diskSeries(services: typeof TV_CAMTUBE_SERVICES): RuntimeServiceSeries[] {
  const levels = [1.05, 0.26, 0.04, 0.62, 0.12]
  return services.map((svc, sIdx) => ({
    ...svc,
    values: Array.from({ length: 24 }, () => levels[sIdx % levels.length]),
  }))
}

export function buildProjectRuntimeMetrics(project: ProjectDetail): ProjectRuntimeMetrics {
  const seed = hashSeed(project.id)
  const services = servicesForProject(project)
  const count = 24
  const labels = timeLabels(count)

  return {
    labels,
    cpu: cpuSeries(seed, services, count),
    memory: memorySeries(seed, services, count),
    network: networkSeries(seed, services, count),
    disk: diskSeries(services),
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
