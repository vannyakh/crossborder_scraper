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

export { formatRelativeTime as formatProjectUpdatedAt } from '../../lib/datetime'
