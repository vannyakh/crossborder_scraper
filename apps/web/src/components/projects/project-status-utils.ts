import type { ProjectEnvironment, ProjectSummary } from './project-sample-data'

export function projectHealthRatio(
  project: Pick<ProjectSummary, 'servicesOnline' | 'servicesTotal'>,
): number {
  if (project.servicesTotal <= 0) return 0
  return project.servicesOnline / project.servicesTotal
}

export function projectHealthTone(
  online: number,
  total: number,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (total <= 0) return 'neutral'
  if (online >= total) return 'success'
  if (online > 0) return 'warning'
  return 'danger'
}

export function projectHealthLabelKey(online: number, total: number): string {
  if (total <= 0) return 'projects.healthEmpty'
  if (online >= total) return 'projects.healthHealthy'
  if (online > 0) return 'projects.healthDegraded'
  return 'projects.healthOffline'
}

const ENV_LABEL_KEY: Record<ProjectEnvironment, string> = {
  production: 'projects.envProduction',
  staging: 'projects.envStaging',
  development: 'projects.envDevelopment',
}

export function projectEnvLabelKey(environment: ProjectEnvironment): string {
  return ENV_LABEL_KEY[environment]
}

export function formatProjectUpdatedAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}
