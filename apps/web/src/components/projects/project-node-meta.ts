import { Bot, Database, GitBranch, Globe, Layers, Server, type LucideIcon } from 'lucide-react'
import type { ProjectNodeKind, ProjectNodeRole } from './project-sample-data'

export type NodeVisualMeta = {
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export const NODE_VISUAL: Record<ProjectNodeKind, NodeVisualMeta> = {
  github: { icon: GitBranch, iconBg: '#24292f', iconColor: '#fff' },
  redis: { icon: Server, iconBg: '#dc382d', iconColor: '#fff' },
  postgres: { icon: Database, iconBg: '#336791', iconColor: '#fff' },
  scrape: { icon: Layers, iconBg: '#16a34a', iconColor: '#fff' },
  agent: { icon: Bot, iconBg: '#7c3aed', iconColor: '#fff' },
  webhook: { icon: Globe, iconBg: '#ea580c', iconColor: '#fff' },
}

export const ROLE_DEFAULTS: Record<ProjectNodeRole, { w: number; h: number }> = {
  trigger: { w: 96, h: 96 },
  action: { w: 96, h: 96 },
  agent: { w: 224, h: 96 },
  config: { w: 80, h: 80 },
}

export function roleForKind(kind: ProjectNodeKind, role?: ProjectNodeRole): ProjectNodeRole {
  if (role) return role
  if (kind === 'webhook') return 'trigger'
  if (kind === 'agent') return 'agent'
  return 'action'
}
