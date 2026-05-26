import { Bot, Home, Settings, Wrench, type LucideIcon } from 'lucide-react'
import { AGENT_NAV, agentSectionPath } from '../components/agent/agent-sections'
import { SETTINGS_NAV, settingsSectionPath } from '../components/settings/settings-sections'
import { SCRAPE_PANEL_NAV, type ScrapeNavBadgeKey } from './scrape-panel'
import { OPERATIONS_TOOL_NAV } from './software-tools'

export type NavLinkItem = {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  description?: string
  badgeKey?: ScrapeNavBadgeKey
}

export type NavChildLink = {
  to: string
  label: string
  end?: boolean
  description?: string
  badgeKey?: ScrapeNavBadgeKey
  /** Filled at render time from stats */
  badge?: string
}

export type NavGroupItem = {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  description?: string
  children: NavChildLink[]
}

export type NavSectionItem = {
  kind: 'section'
  id: string
  label: string
}

export type NavEntry = NavLinkItem | NavGroupItem | NavSectionItem

const agentNavChildren: NavChildLink[] = AGENT_NAV.map((item) => ({
  to: agentSectionPath(item.id),
  label: item.label,
  description: item.description,
}))

const settingsNavChildren: NavChildLink[] = SETTINGS_NAV.map((item) => ({
  to: settingsSectionPath(item.id),
  label: item.label,
  description: item.description,
}))

const scrapeNav = SCRAPE_PANEL_NAV.group

export const navEntries: NavEntry[] = [
  { kind: 'link', to: '/', label: 'Overview', icon: Home, end: true },
  { kind: 'section', id: 'scrape-panel', label: SCRAPE_PANEL_NAV.sectionLabel },
  {
    kind: 'group',
    id: scrapeNav.id,
    label: scrapeNav.label,
    icon: scrapeNav.icon,
    description: scrapeNav.description,
    children: [...scrapeNav.items],
  },
  { kind: 'section', id: 'panel-tools', label: 'Panel' },
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
