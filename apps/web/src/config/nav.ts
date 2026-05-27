import { Bot, Database, Home, Play, Plug, Settings, Wrench, type LucideIcon } from 'lucide-react'
import { AGENT_NAV } from '../components/agent/agent-sections'
import { INTEGRATE_CHANNELS } from '../components/integrate/integrate-sections'
import { SETTINGS_NAV } from '../components/settings/settings-sections'
import type { TranslateFn } from '../locale/types'
import {
  AGENT_SECTION_I18N,
  INTEGRATE_SECTION_I18N,
  OPERATIONS_ROUTE_I18N,
  OPERATIONS_ROUTES,
  ROUTE_PATHS,
  SCRAPE_NAV_ITEMS,
  SETTINGS_SECTION_I18N,
  agentPath,
  integratePath,
  settingsPath,
  type NavChildDef,
} from '../routes/route-config'

export type NavLinkItem = {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  description?: string
  badgeKey?: NavChildDef['badgeKey']
}

export type NavChildLink = {
  to: string
  label: string
  end?: boolean
  description?: string
  badgeKey?: NavChildDef['badgeKey']
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

type NavLinkDef = {
  kind: 'link'
  path: string
  labelKey: string
  icon: LucideIcon
  end?: boolean
}

type NavSectionDef = {
  kind: 'section'
  id: string
  labelKey: string
}

type NavGroupDef = {
  kind: 'group'
  id: string
  labelKey: string
  descriptionKey?: string
  icon: LucideIcon
  children: NavChildDef[]
}

type NavLayoutEntry = NavLinkDef | NavSectionDef | NavGroupDef

function getNavLayout(): NavLayoutEntry[] {
  const agentChildren: NavChildDef[] = AGENT_NAV.map((item) => {
    const i18n = AGENT_SECTION_I18N[item.id]
    return {
      path: agentPath(item.id),
      labelKey: i18n?.labelKey ?? 'nav.agent',
      descriptionKey: i18n?.descriptionKey,
    }
  })

  const integrateChildren: NavChildDef[] = INTEGRATE_CHANNELS.map((item) => {
    const i18n = INTEGRATE_SECTION_I18N[item.id]
    return {
      path: integratePath(item.id),
      labelKey: i18n?.labelKey ?? 'nav.integrate',
      descriptionKey: i18n?.descriptionKey,
    }
  })

  const settingsChildren: NavChildDef[] = SETTINGS_NAV.map((item) => {
    const i18n = SETTINGS_SECTION_I18N[item.id]
    return {
      path: settingsPath(item.id),
      labelKey: i18n?.labelKey ?? 'nav.settings',
      descriptionKey: i18n?.descriptionKey,
    }
  })

  const operationsChildren: NavChildDef[] = OPERATIONS_ROUTES.map((path) => ({
    path,
    labelKey: OPERATIONS_ROUTE_I18N[path] ?? 'nav.tools',
  }))

  return [
    { kind: 'link', path: ROUTE_PATHS.home, labelKey: 'nav.overview', icon: Home, end: true },
    { kind: 'section', id: 'scrape-panel', labelKey: 'nav.scrapePanel' },
    {
      kind: 'group',
      id: 'scrape',
      labelKey: 'nav.scrape',
      descriptionKey: 'nav.scrapeDesc',
      icon: Play,
      children: [...SCRAPE_NAV_ITEMS],
    },
    { kind: 'section', id: 'panel-tools', labelKey: 'nav.panel' },
    {
      kind: 'link',
      path: ROUTE_PATHS.databases.base,
      labelKey: 'nav.databases',
      icon: Database,
    },
    {
      kind: 'group',
      id: 'tools',
      labelKey: 'nav.tools',
      icon: Wrench,
      children: operationsChildren,
    },
    {
      kind: 'group',
      id: 'agent',
      labelKey: 'nav.agent',
      icon: Bot,
      children: agentChildren,
    },
    {
      kind: 'group',
      id: 'integrate',
      labelKey: 'nav.integrate',
      descriptionKey: 'nav.integrateDesc',
      icon: Plug,
      children: integrateChildren,
    },
    {
      kind: 'group',
      id: 'settings',
      labelKey: 'nav.settings',
      icon: Settings,
      children: settingsChildren,
    },
  ]
}

function mapNavChild(child: NavChildDef, t: TranslateFn): NavChildLink {
  return {
    to: child.path,
    label: t(child.labelKey),
    description: child.descriptionKey ? t(child.descriptionKey) : undefined,
    badgeKey: child.badgeKey,
    ...(child.end ? { end: child.end } : {}),
  }
}

function mapNavEntry(entry: NavLayoutEntry, t: TranslateFn): NavEntry {
  if (entry.kind === 'link') {
    return {
      kind: 'link',
      to: entry.path,
      label: t(entry.labelKey),
      icon: entry.icon,
      end: entry.end,
    }
  }
  if (entry.kind === 'section') {
    return {
      kind: 'section',
      id: entry.id,
      label: t(entry.labelKey),
    }
  }
  return {
    kind: 'group',
    id: entry.id,
    label: t(entry.labelKey),
    icon: entry.icon,
    description: entry.descriptionKey ? t(entry.descriptionKey) : undefined,
    children: entry.children.map((child) => mapNavChild(child, t)),
  }
}

export function buildNavEntries(t: TranslateFn): NavEntry[] {
  return getNavLayout().map((entry) => mapNavEntry(entry, t))
}

export function isPathActive(pathname: string, to: string, end?: boolean): boolean {
  if (end || to === '/') {
    return pathname === to
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function isGroupActive(pathname: string, children: NavChildLink[]): boolean {
  return children.some((c) => isPathActive(pathname, c.to, c.end))
}
