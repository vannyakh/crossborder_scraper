import { Bot, Database, Home, Play, Settings, Wrench, type LucideIcon } from 'lucide-react'
import {
  AGENT_NAV,
  agentSectionPath,
  isAgentSectionId,
  type AgentSectionId,
} from '../components/agent/agent-sections'
import {
  isArtifactSectionId,
  type ArtifactSectionId,
} from '../components/artifact/artifact-sections'
import { ROADMAP_FEATURE_MAP, isRoadmapFeatureId } from '../components/roadmap/roadmap-sections'
import {
  SETTINGS_NAV,
  settingsSectionPath,
  isSettingsSectionId,
} from '../components/settings/settings-sections'
import {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
} from '../config/databases'
import type { TranslateFn } from '../locale/types'

export type BreadcrumbCrumb = {
  label: string
  to?: string
  icon?: LucideIcon
}

const AGENT_LABEL_KEYS: Record<AgentSectionId, string> = {
  chat: 'nav.agentChat',
  telegram: 'nav.telegram',
  schedules: 'nav.schedules',
  runs: 'nav.runHistory',
  workflows: 'nav.workflows',
  tools: 'nav.toolCatalog',
  skills: 'nav.skills',
}

const SETTINGS_LABEL_KEYS: Record<(typeof SETTINGS_NAV)[number]['id'], string> = {
  panel: 'nav.panelTheme',
  network: 'nav.networkFirewall',
  ai: 'nav.aiLlm',
  proxy: 'nav.proxy',
}

const ARTIFACT_LABEL_KEYS: Record<ArtifactSectionId, string> = {
  products: 'nav.productCatalog',
  files: 'nav.exportFiles',
}

const OPERATIONS_ROUTES: Record<string, string> = {
  '/monitor': 'nav.liveMonitor',
  '/store': 'nav.appStore',
  '/logs': 'nav.logs',
  '/health': 'nav.health',
  '/support': 'nav.support',
}

function withOverview(t: TranslateFn): BreadcrumbCrumb {
  return { label: t('nav.overview'), to: '/', icon: Home }
}

function scrapeGroup(t: TranslateFn): BreadcrumbCrumb {
  return { label: t('nav.scrape'), to: '/workflow/batches', icon: Play }
}

export function buildBreadcrumbTrail(pathname: string, t: TranslateFn): BreadcrumbCrumb[] {
  const overview = withOverview(t)

  if (pathname === '/' || pathname === '') {
    return [{ label: overview.label, icon: Home }]
  }

  const crumbs: BreadcrumbCrumb[] = [overview]

  if (pathname.startsWith('/workflow')) {
    crumbs.push(scrapeGroup(t))
    crumbs.push({ label: t('nav.batchQueue') })
    return crumbs
  }

  if (pathname.startsWith('/artifact/products/')) {
    const id = pathname.split('/').pop()
    crumbs.push(scrapeGroup(t))
    crumbs.push({ label: t('nav.productCatalog'), to: '/artifact/products' })
    crumbs.push({ label: id ? `#${id}` : t('nav.productCatalog') })
    return crumbs
  }

  if (pathname.startsWith('/artifact')) {
    crumbs.push(scrapeGroup(t))
    const section = pathname.split('/')[2]
    const labelKey =
      section && isArtifactSectionId(section)
        ? ARTIFACT_LABEL_KEYS[section]
        : 'nav.productCatalog'
    crumbs.push({ label: t(labelKey) })
    return crumbs
  }

  if (pathname.startsWith('/agent')) {
    crumbs.push({ label: t('nav.agent'), to: agentSectionPath('chat'), icon: Bot })
    const section = pathname.split('/')[2]
    if (section && isAgentSectionId(section)) {
      crumbs.push({ label: t(AGENT_LABEL_KEYS[section]) })
    } else {
      crumbs.push({ label: t(AGENT_LABEL_KEYS.chat) })
    }
    return crumbs
  }

  if (pathname.startsWith('/settings')) {
    crumbs.push({ label: t('nav.settings'), to: settingsSectionPath('ai'), icon: Settings })
    const section = pathname.split('/')[2]
    if (section && isSettingsSectionId(section)) {
      const navItem = SETTINGS_NAV.find((item) => item.id === section)
      crumbs.push({
        label: t(SETTINGS_LABEL_KEYS[section]),
        icon: navItem?.icon,
      })
    }
    return crumbs
  }

  if (pathname.startsWith('/roadmap/')) {
    const feature = pathname.split('/')[2]
    if (feature && isRoadmapFeatureId(feature)) {
      const item = ROADMAP_FEATURE_MAP[feature]
      crumbs.push({ label: item.label, icon: item.icon })
    }
    return crumbs
  }

  if (pathname.startsWith('/databases')) {
    crumbs.push({ label: t('nav.databases'), to: databaseEnginePath(DEFAULT_DATABASE_ENGINE), icon: Database })
    const engine = pathname.split('/')[2]
    const tab = DATABASE_ENGINE_TABS.find((item) => item.id === engine)
    if (tab) {
      crumbs.push({ label: t(tab.labelKey) })
    }
    return crumbs
  }

  const operationsKey = OPERATIONS_ROUTES[pathname]
  if (operationsKey) {
    crumbs.push({ label: t('nav.tools'), to: '/monitor', icon: Wrench })
    crumbs.push({ label: t(operationsKey) })
    return crumbs
  }

  const agentFallback = AGENT_NAV.find((item) => pathname === agentSectionPath(item.id))
  if (agentFallback) {
    crumbs.push({ label: t('nav.agent'), icon: Bot })
    crumbs.push({ label: t(AGENT_LABEL_KEYS[agentFallback.id]) })
    return crumbs
  }

  const segment = pathname.split('/').filter(Boolean).pop()
  crumbs.push({ label: segment ?? pathname })
  return crumbs
}
