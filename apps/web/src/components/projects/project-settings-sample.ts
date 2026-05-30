import type { ProjectDetail, ProjectEnvironment } from './project-sample-data'

export type ProjectVisibility = 'private' | 'workspace'

export type ProjectSettingsForm = {
  name: string
  description: string
  displayId: string
  visibility: ProjectVisibility
}

export type ProjectMember = {
  id: string
  name: string
  role: string
}

export type ProjectToken = {
  id: string
  label: string
  prefix: string
  createdAt: string
}

export type ProjectVariable = {
  key: string
  scope: 'project' | 'shared'
  masked: boolean
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

export function buildProjectSettingsForm(project: ProjectDetail): ProjectSettingsForm {
  return {
    name: project.name,
    description: project.description ?? '',
    displayId: projectDisplayId(project.id),
    visibility: 'private',
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

export function sampleMembers(): ProjectMember[] {
  return [
    { id: 'm1', name: 'Panel admin', role: 'Owner' },
    { id: 'm2', name: 'Ops', role: 'Editor' },
  ]
}

export function sampleTokens(): ProjectToken[] {
  return [
    { id: 't1', label: 'Deploy hook', prefix: 'cb_proj_••••7f2a', createdAt: '2026-05-20' },
    { id: 't2', label: 'CI read', prefix: 'cb_proj_••••91bc', createdAt: '2026-05-12' },
  ]
}

export function sampleVariables(project: ProjectDetail): ProjectVariable[] {
  const base: ProjectVariable[] = [
    { key: 'CROSSBORDER_WWWROOT', scope: 'shared', masked: false },
    { key: 'DATABASE_URL', scope: 'project', masked: true },
  ]
  if (project.id === 'telegram-ops') {
    base.push({ key: 'TELEGRAM_BOT_TOKEN', scope: 'project', masked: true })
  }
  return base
}
