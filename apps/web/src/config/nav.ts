import { Bot, Database, Home, Plug, Play, Settings, Wrench, type LucideIcon } from 'lucide-react'
import { AGENT_NAV, agentSectionPath } from '../components/agent/agent-sections'
import { INTEGRATE_CHANNELS, integrateSectionPath } from '../components/integrate/integrate-sections'
import { SETTINGS_NAV, settingsSectionPath } from '../components/settings/settings-sections'
import { SCRAPE_PANEL_ITEMS, type ScrapeNavBadgeKey } from './scrape-panel'
import { OPERATIONS_TOOL_NAV } from './software-tools'
import type { TranslateFn } from '../locale/types'

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

const AGENT_LABEL_KEYS: Record<(typeof AGENT_NAV)[number]['id'], { label: string; description: string }> = {
  chat: { label: 'nav.agentChat', description: 'nav.agentChatDesc' },
  schedules: { label: 'nav.schedules', description: 'nav.schedulesDesc' },
  runs: { label: 'nav.runHistory', description: 'nav.runHistoryDesc' },
  workflows: { label: 'nav.workflows', description: 'nav.workflowsDesc' },
  tools: { label: 'nav.toolCatalog', description: 'nav.toolCatalogDesc' },
  skills: { label: 'nav.skills', description: 'nav.skillsDesc' },
}

const INTEGRATE_LABEL_KEYS: Record<(typeof INTEGRATE_CHANNELS)[number]['id'], { label: string; description: string }> = {
  telegram: { label: 'nav.telegram', description: 'nav.telegramDesc' },
  discord: { label: 'nav.discord', description: 'nav.discordDesc' },
  slack: { label: 'nav.slack', description: 'nav.slackDesc' },
  email: { label: 'nav.email', description: 'nav.emailDesc' },
}

const SETTINGS_LABEL_KEYS: Record<(typeof SETTINGS_NAV)[number]['id'], { label: string; description: string }> = {
  panel: { label: 'nav.panelTheme', description: 'nav.panelThemeDesc' },
  network: { label: 'nav.networkFirewall', description: 'nav.networkFirewallDesc' },
  ai: { label: 'nav.aiLlm', description: 'nav.aiLlmDesc' },
  proxy: { label: 'nav.proxy', description: 'nav.proxyDesc' },
}

const SCRAPE_LABEL_KEYS = {
  batchQueue: { label: 'nav.batchQueue', description: 'nav.batchQueueDesc' },
  productCatalog: { label: 'nav.productCatalog', description: 'nav.productCatalogDesc' },
  exportFiles: { label: 'nav.exportFiles', description: 'nav.exportFilesDesc' },
} as const

const OPERATIONS_LABEL_KEYS: Record<(typeof OPERATIONS_TOOL_NAV)[number]['to'], string> = {
  '/monitor': 'nav.liveMonitor',
  '/store': 'nav.appStore',
  '/logs': 'nav.logs',
  '/health': 'nav.health',
  '/support': 'nav.support',
}

export function buildNavEntries(t: TranslateFn): NavEntry[] {
  const agentNavChildren: NavChildLink[] = AGENT_NAV.map((item) => {
    const keys = AGENT_LABEL_KEYS[item.id]
    return {
      to: agentSectionPath(item.id),
      label: t(keys.label),
      description: t(keys.description),
    }
  })

  const settingsNavChildren: NavChildLink[] = SETTINGS_NAV.map((item) => {
    const keys = SETTINGS_LABEL_KEYS[item.id]
    return {
      to: settingsSectionPath(item.id),
      label: t(keys.label),
      description: t(keys.description),
    }
  })

  const scrapeChildren: NavChildLink[] = SCRAPE_PANEL_ITEMS.map((item, index) => {
    const key =
      index === 0
        ? SCRAPE_LABEL_KEYS.batchQueue
        : index === 1
          ? SCRAPE_LABEL_KEYS.productCatalog
          : SCRAPE_LABEL_KEYS.exportFiles
    return {
      to: item.to,
      label: t(key.label),
      description: t(key.description),
      badgeKey: item.badgeKey,
      ...('end' in item ? { end: item.end } : {}),
    }
  })

  const operationsChildren: NavChildLink[] = OPERATIONS_TOOL_NAV.map((item) => ({
    to: item.to,
    label: t(OPERATIONS_LABEL_KEYS[item.to]),
  }))

  const integrateChildren: NavChildLink[] = INTEGRATE_CHANNELS.map((item) => {
    const keys = INTEGRATE_LABEL_KEYS[item.id]
    return {
      to: integrateSectionPath(item.id),
      label: t(keys.label),
      description: t(keys.description),
    }
  })

  return [
    { kind: 'link', to: '/', label: t('nav.overview'), icon: Home, end: true },
    { kind: 'section', id: 'scrape-panel', label: t('nav.scrapePanel') },
    {
      kind: 'group',
      id: 'scrape',
      label: t('nav.scrape'),
      icon: Play,
      description: t('nav.scrapeDesc'),
      children: scrapeChildren,
    },
    { kind: 'section', id: 'panel-tools', label: t('nav.panel') },
    {
      kind: 'link',
      to: '/databases',
      label: t('nav.databases'),
      icon: Database,
    },
    {
      kind: 'group',
      id: 'tools',
      label: t('nav.tools'),
      icon: Wrench,
      children: operationsChildren,
    },
    {
      kind: 'group',
      id: 'agent',
      label: t('nav.agent'),
      icon: Bot,
      children: agentNavChildren,
    },
    {
      kind: 'group',
      id: 'integrate',
      label: t('nav.integrate'),
      icon: Plug,
      description: t('nav.integrateDesc'),
      children: integrateChildren,
    },
    {
      kind: 'group',
      id: 'settings',
      label: t('nav.settings'),
      icon: Settings,
      children: settingsNavChildren,
    },
  ]
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
