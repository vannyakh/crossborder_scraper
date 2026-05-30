import {
  Bell,
  Bot,
  Clock,
  Database,
  GitBranch,
  Globe,
  Layers,
  Package,
  Server,
  Split,
  type LucideIcon,
} from 'lucide-react'
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
  schedule: { icon: Clock, iconBg: '#0ea5e9', iconColor: '#fff' },
  export: { icon: Package, iconBg: '#059669', iconColor: '#fff' },
  condition: { icon: Split, iconBg: '#ca8a04', iconColor: '#fff' },
  notify: { icon: Bell, iconBg: '#6366f1', iconColor: '#fff' },
}

export const ROLE_DEFAULTS: Record<ProjectNodeRole, { w: number; h: number }> = {
  trigger: { w: 108, h: 108 },
  action: { w: 108, h: 108 },
  agent: { w: 260, h: 76 },
  config: { w: 72, h: 72 },
}

export function roleForKind(kind: ProjectNodeKind, role?: ProjectNodeRole): ProjectNodeRole {
  if (role) return role
  if (kind === 'webhook' || kind === 'schedule') return 'trigger'
  if (kind === 'agent') return 'agent'
  return 'action'
}
