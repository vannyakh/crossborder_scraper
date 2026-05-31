import type { ProjectDetail, ProjectEnvironment } from './project-sample-data'

export type ProjectSettingsForm = {
  name: string
  description: string
  projectId: string
  environment: ProjectEnvironment
  visibility: 'private' | 'workspace'
}

/** Stable preview UUID derived from project slug (not a real backend id). */
export function projectDisplayId(projectId: string): string {
  const hex = Array.from(projectId)
    .map((c, i) => ((c.charCodeAt(0) * (i + 7)) % 16).toString(16))
    .join('')
    .padEnd(32, '0')
    .slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function buildProjectSettingsForm(
  project: ProjectDetail,
  visibility: 'private' | 'workspace' = 'private',
): ProjectSettingsForm {
  return {
    name: project.name,
    description: project.description ?? '',
    projectId: project.id,
    environment: project.environment,
    visibility,
  }
}

export function environmentLabelKey(env: ProjectEnvironment): string {
  const map: Record<ProjectEnvironment, string> = {
    production: 'projects.envProduction',
    staging: 'projects.envStaging',
    development: 'projects.envDevelopment',
  }
  return map[env]
}
