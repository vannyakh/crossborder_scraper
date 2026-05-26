import { Bot, Home, Settings, Sparkles, Warehouse, Wrench, type LucideIcon } from 'lucide-react'
import { AGENT_NAV, agentSectionPath } from '../components/agent/agent-sections'
import { ROADMAP_FEATURES, roadmapPath } from '../components/roadmap/roadmap-sections'
import { SETTINGS_NAV, settingsSectionPath } from '../components/settings/settings-sections'
import { INVENTORY_NAV } from '../components/inventory/inventory-sections'
import { OPERATIONS_TOOL_NAV } from './software-tools'

export type NavLinkItem = {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export type NavChildLink = {
  to: string
  label: string
  end?: boolean
  soon?: boolean
}

export type NavGroupItem = {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  children: NavChildLink[]
}

export type NavEntry = NavLinkItem | NavGroupItem

const agentNavChildren: NavChildLink[] = AGENT_NAV.map((item) => ({
  to: agentSectionPath(item.id),
  label: item.label,
}))

const settingsNavChildren: NavChildLink[] = SETTINGS_NAV.map((item) => ({
  to: settingsSectionPath(item.id),
  label: item.label,
}))

const roadmapNavChildren: NavChildLink[] = ROADMAP_FEATURES.map((item) => ({
  to: roadmapPath(item.id),
  label: item.label,
  soon: true,
}))

export const navEntries: NavEntry[] = [
  { kind: 'link', to: '/', label: 'Overview', icon: Home, end: true },
  {
    kind: 'group',
    id: 'inventory',
    label: 'Inventory',
    icon: Warehouse,
    children: [...INVENTORY_NAV],
  },
  {
    kind: 'group',
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    children: [...OPERATIONS_TOOL_NAV],
  },
  {
    kind: 'group',
    id: 'agent',
    label: 'Agent',
    icon: Bot,
    children: agentNavChildren,
  },
  {
    kind: 'group',
    id: 'roadmap',
    label: 'Roadmap',
    icon: Sparkles,
    children: roadmapNavChildren,
  },
  {
    kind: 'group',
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: settingsNavChildren,
  },
]

/** @deprecated use navEntries */
export const navItems = navEntries

export function isPathActive(pathname: string, to: string, end?: boolean): boolean {
  if (end || to === '/') {
    return pathname === to
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function isGroupActive(pathname: string, children: NavChildLink[]): boolean {
  return children.some((c) => isPathActive(pathname, c.to, c.end))
}
