import {
  Bot,
  Bug,
  Database,
  FolderKanban,
  Home,
  Play,
  Plug,
  Settings,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { AgentSectionId } from '../components/agent/agent-sections'
import type { ArtifactSectionId } from '../components/artifact/artifact-sections'
import type { DebugSectionId } from '../components/debug/debug-sections'
import { DEFAULT_DEBUG_SECTION as DEBUG_DEFAULT_SECTION } from '../components/debug/debug-sections'
import type { IntegrateChannelId } from '../components/integrate/integrate-sections'
import {
  isRoadmapFeatureId,
  ROADMAP_FEATURE_MAP,
  type RoadmapFeatureId,
} from '../components/roadmap/roadmap-sections'
import type { SettingsSectionId } from '../components/settings/settings-sections'
import {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  type DatabaseEngineId,
} from '../config/databases'
import type { ScrapeNavBadgeKey } from '../config/scrape-panel'

/** Default section ids — kept here so router redirects do not import page modules. */
export const DEFAULT_AGENT_SECTION: AgentSectionId = 'chat'
export const DEFAULT_DEBUG_SECTION: DebugSectionId = DEBUG_DEFAULT_SECTION
export const DEFAULT_INTEGRATE_CHANNEL: IntegrateChannelId = 'telegram'
export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'ai'

/** Canonical app paths — single source for router, nav, and breadcrumbs. */
export const ROUTE_PATHS = {
  home: '/',
  workflow: {
    base: '/workflow',
    batches: '/workflow/batches',
  },
  artifact: {
    base: '/artifact',
    products: '/artifact/products',
    product: (id: string | number) => `/artifact/products/${id}`,
    files: '/artifact/files',
  },
  agent: {
    base: '/agent',
    section: (section: AgentSectionId = DEFAULT_AGENT_SECTION) => `/agent/${section}`,
    /** Legacy redirect target */
    telegramLegacy: '/agent/telegram',
  },
  integrate: {
    base: '/integrate',
    channel: (channel: IntegrateChannelId = DEFAULT_INTEGRATE_CHANNEL) => `/integrate/${channel}`,
  },
  settings: {
    base: '/settings',
    section: (section: SettingsSectionId = DEFAULT_SETTINGS_SECTION) => `/settings/${section}`,
    serviceLegacy: '/settings/service',
  },
  databases: {
    base: '/databases',
    engine: (engine: DatabaseEngineId = DEFAULT_DATABASE_ENGINE) => `/databases/${engine}`,
  },
  projects: {
    base: '/projects',
    detail: (id: string, section = 'flow' as const) => `/projects/${id}/${section}`,
    section: (id: string, section: string) => `/projects/${id}/${section}`,
  },
  monitor: '/monitor',
  store: '/store',
  docker: '/docker',
  firewall: '/firewall',
  vhost: '/vhost',
  debug: {
    base: '/debug',
    section: (section: DebugSectionId = DEFAULT_DEBUG_SECTION) => `/debug/${section}`,
  },
  /** @deprecated use debug.section('logs') — legacy redirect at router */
  logs: '/debug/logs',
  health: '/health',
  guides: '/guides',
  support: '/support',
  login: '/login',
  serverError: '/error/server',
  roadmap: {
    base: '/roadmap',
    feature: (id: RoadmapFeatureId) => `/roadmap/${id}`,
  },
} as const

/** Panel tool routes grouped under the Tools sidebar section. */
export const OPERATIONS_ROUTES = [
  ROUTE_PATHS.monitor,
  ROUTE_PATHS.store,
  ROUTE_PATHS.docker,
  ROUTE_PATHS.firewall,
  ROUTE_PATHS.vhost,
  ROUTE_PATHS.health,
  ROUTE_PATHS.guides,
  ROUTE_PATHS.support,
] as const

/** Debug sidebar routes — logs and gateway tool catalog. */
export const DEBUG_ROUTES = [
  ROUTE_PATHS.debug.section('logs'),
  ROUTE_PATHS.debug.section('tools'),
] as const

export type DebugRoute = (typeof DEBUG_ROUTES)[number]

export type OperationsRoute = (typeof OPERATIONS_ROUTES)[number]

export function agentPath(section: AgentSectionId = DEFAULT_AGENT_SECTION): string {
  return ROUTE_PATHS.agent.section(section)
}

export function debugPath(section: DebugSectionId = DEFAULT_DEBUG_SECTION): string {
  return ROUTE_PATHS.debug.section(section)
}

export function integratePath(channel: IntegrateChannelId = DEFAULT_INTEGRATE_CHANNEL): string {
  return ROUTE_PATHS.integrate.channel(channel)
}

export function settingsPath(section: SettingsSectionId = DEFAULT_SETTINGS_SECTION): string {
  return ROUTE_PATHS.settings.section(section)
}

export function artifactSectionPath(section: ArtifactSectionId): string {
  return section === 'products' ? ROUTE_PATHS.artifact.products : ROUTE_PATHS.artifact.files
}

export function databaseEnginePath(engine: DatabaseEngineId = DEFAULT_DATABASE_ENGINE): string {
  return ROUTE_PATHS.databases.engine(engine)
}

export function roadmapPath(feature: RoadmapFeatureId): string {
  return ROUTE_PATHS.roadmap.feature(feature)
}

export function projectPath(id: string): string {
  return ROUTE_PATHS.projects.detail(id, 'flow')
}

export function projectSectionPath(id: string, section: string): string {
  return ROUTE_PATHS.projects.section(id, section)
}

/** i18n keys for agent sidebar / breadcrumb leaf labels */
export const AGENT_SECTION_I18N: Record<
  AgentSectionId,
  { labelKey: string; descriptionKey: string }
> = {
  chat: { labelKey: 'nav.agentChat', descriptionKey: 'nav.agentChatDesc' },
  schedules: { labelKey: 'nav.schedules', descriptionKey: 'nav.schedulesDesc' },
  runs: { labelKey: 'nav.runHistory', descriptionKey: 'nav.runHistoryDesc' },
  workflows: { labelKey: 'nav.workflows', descriptionKey: 'nav.workflowsDesc' },
  skills: { labelKey: 'nav.skills', descriptionKey: 'nav.skillsDesc' },
  rules: { labelKey: 'nav.rules', descriptionKey: 'nav.rulesDesc' },
}

export const DEBUG_SECTION_I18N: Record<
  DebugSectionId,
  { labelKey: string; descriptionKey: string }
> = {
  logs: { labelKey: 'nav.logs', descriptionKey: 'nav.logsDesc' },
  tools: { labelKey: 'nav.toolCatalog', descriptionKey: 'nav.toolCatalogDesc' },
}

export const INTEGRATE_SECTION_I18N: Record<
  IntegrateChannelId,
  { labelKey: string; descriptionKey: string }
> = {
  telegram: { labelKey: 'nav.telegram', descriptionKey: 'nav.telegramDesc' },
  discord: { labelKey: 'nav.discord', descriptionKey: 'nav.discordDesc' },
  slack: { labelKey: 'nav.slack', descriptionKey: 'nav.slackDesc' },
  email: { labelKey: 'nav.email', descriptionKey: 'nav.emailDesc' },
}

export const SETTINGS_SECTION_I18N: Record<
  SettingsSectionId,
  { labelKey: string; descriptionKey: string }
> = {
  panel: { labelKey: 'nav.panelTheme', descriptionKey: 'nav.panelThemeDesc' },
  network: { labelKey: 'nav.networkFirewall', descriptionKey: 'nav.networkFirewallDesc' },
  ai: { labelKey: 'nav.aiLlm', descriptionKey: 'nav.aiLlmDesc' },
  proxy: { labelKey: 'nav.proxy', descriptionKey: 'nav.proxyDesc' },
}

export const ARTIFACT_SECTION_I18N: Record<ArtifactSectionId, string> = {
  products: 'nav.productCatalog',
  files: 'nav.exportFiles',
}

export const OPERATIONS_ROUTE_I18N: Record<OperationsRoute, string> = {
  '/monitor': 'nav.liveMonitor',
  '/store': 'nav.appStore',
  '/docker': 'nav.docker',
  '/firewall': 'nav.firewall',
  '/vhost': 'nav.vhost',
  '/health': 'nav.health',
  '/guides': 'nav.guides',
  '/support': 'nav.support',
}

export const DEBUG_ROUTE_I18N: Record<DebugRoute, string> = {
  '/debug/logs': 'nav.logs',
  '/debug/tools': 'nav.toolCatalog',
}

export const SCRAPE_NAV_ITEMS = [
  {
    path: ROUTE_PATHS.workflow.batches,
    labelKey: 'nav.batchQueue',
    descriptionKey: 'nav.batchQueueDesc',
    badgeKey: 'running_batches' as ScrapeNavBadgeKey,
    end: true,
  },
  {
    path: ROUTE_PATHS.artifact.products,
    labelKey: 'nav.productCatalog',
    descriptionKey: 'nav.productCatalogDesc',
    badgeKey: 'products' as ScrapeNavBadgeKey,
  },
  {
    path: ROUTE_PATHS.artifact.files,
    labelKey: 'nav.exportFiles',
    descriptionKey: 'nav.exportFilesDesc',
    badgeKey: 'output_files' as ScrapeNavBadgeKey,
  },
] as const

export type NavChildDef = {
  path: string
  labelKey: string
  descriptionKey?: string
  end?: boolean
  badgeKey?: ScrapeNavBadgeKey
}

export type BreadcrumbSegmentDef = {
  labelKey?: string
  /** When set, overrides labelKey (e.g. product id, roadmap feature title). */
  label?: string
  path?: string
  icon?: LucideIcon
}

function overviewCrumb(): BreadcrumbSegmentDef {
  return { labelKey: 'nav.overview', path: ROUTE_PATHS.home, icon: Home }
}

function scrapeGroupCrumb(): BreadcrumbSegmentDef {
  return { labelKey: 'nav.scrape', path: ROUTE_PATHS.workflow.batches, icon: Play }
}

type RoutePattern = {
  priority: number
  match: (pathname: string) => boolean
  segments: (pathname: string) => BreadcrumbSegmentDef[]
}

const ROUTE_PATTERNS: RoutePattern[] = [
  {
    priority: 100,
    match: (p) => p === '/' || p === '',
    segments: () => [{ labelKey: 'nav.overview', icon: Home }],
  },
  {
    priority: 90,
    match: (p) => p.startsWith('/artifact/products/') && p.split('/').length > 3,
    segments: (p) => {
      const id = p.split('/').pop()
      return [
        overviewCrumb(),
        scrapeGroupCrumb(),
        { labelKey: 'nav.productCatalog', path: ROUTE_PATHS.artifact.products },
        { label: id ? `#${id}` : undefined, labelKey: id ? undefined : 'nav.productCatalog' },
      ]
    },
  },
  {
    priority: 80,
    match: (p) => p.startsWith('/artifact'),
    segments: (p) => {
      const section = p.split('/')[2] as ArtifactSectionId | undefined
      const labelKey =
        section && section in ARTIFACT_SECTION_I18N
          ? ARTIFACT_SECTION_I18N[section]
          : 'nav.productCatalog'
      return [overviewCrumb(), scrapeGroupCrumb(), { labelKey }]
    },
  },
  {
    priority: 80,
    match: (p) => p.startsWith('/workflow'),
    segments: () => [overviewCrumb(), scrapeGroupCrumb(), { labelKey: 'nav.batchQueue' }],
  },
  {
    priority: 75,
    match: (p) => p.startsWith('/projects'),
    segments: (p) => {
      const id = p.split('/')[2]
      return [
        overviewCrumb(),
        { labelKey: 'nav.projects', path: ROUTE_PATHS.projects.base, icon: FolderKanban },
        ...(id ? [{ label: id } satisfies BreadcrumbSegmentDef] : []),
      ]
    },
  },
  {
    priority: 70,
    match: (p) => p.startsWith('/integrate'),
    segments: (p) => {
      const channel = p.split('/')[2] as IntegrateChannelId | undefined
      const leafKey =
        channel && channel in INTEGRATE_SECTION_I18N
          ? INTEGRATE_SECTION_I18N[channel].labelKey
          : INTEGRATE_SECTION_I18N.telegram.labelKey
      return [
        overviewCrumb(),
        { labelKey: 'nav.integrate', path: integratePath(), icon: Plug },
        { labelKey: leafKey },
      ]
    },
  },
  {
    priority: 80,
    match: (p) => p.startsWith('/debug'),
    segments: (p) => {
      const section = p.split('/')[2] as DebugSectionId | undefined
      const leafKey =
        section && section in DEBUG_SECTION_I18N
          ? DEBUG_SECTION_I18N[section].labelKey
          : DEBUG_SECTION_I18N.logs.labelKey
      return [
        overviewCrumb(),
        { labelKey: 'nav.debug', path: debugPath(), icon: Bug },
        { labelKey: leafKey },
      ]
    },
  },
  {
    priority: 70,
    match: (p) => p.startsWith('/agent'),
    segments: (p) => {
      const section = p.split('/')[2] as AgentSectionId | undefined
      const leafKey =
        section && section in AGENT_SECTION_I18N
          ? AGENT_SECTION_I18N[section].labelKey
          : AGENT_SECTION_I18N.chat.labelKey
      return [
        overviewCrumb(),
        { labelKey: 'nav.agent', path: agentPath(), icon: Bot },
        { labelKey: leafKey },
      ]
    },
  },
  {
    priority: 70,
    match: (p) => p.startsWith('/settings'),
    segments: (p) => {
      const section = p.split('/')[2] as SettingsSectionId | undefined
      const leafKey =
        section && section in SETTINGS_SECTION_I18N
          ? SETTINGS_SECTION_I18N[section].labelKey
          : undefined
      return [
        overviewCrumb(),
        { labelKey: 'nav.settings', path: settingsPath(), icon: Settings },
        ...(leafKey ? [{ labelKey: leafKey } satisfies BreadcrumbSegmentDef] : []),
      ]
    },
  },
  {
    priority: 60,
    match: (p) => p.startsWith('/roadmap/'),
    segments: (p) => {
      const feature = p.split('/')[2]
      if (feature && isRoadmapFeatureId(feature)) {
        const item = ROADMAP_FEATURE_MAP[feature]
        return [overviewCrumb(), { label: item.label, icon: item.icon }]
      }
      return [overviewCrumb(), { label: feature ?? p }]
    },
  },
  {
    priority: 60,
    match: (p) => p.startsWith('/databases'),
    segments: (p) => {
      const engine = p.split('/')[2]
      const tab = DATABASE_ENGINE_TABS.find((item) => item.id === engine)
      return [
        overviewCrumb(),
        {
          labelKey: 'nav.databases',
          path: databaseEnginePath(),
          icon: Database,
        },
        ...(tab ? [{ labelKey: tab.labelKey } satisfies BreadcrumbSegmentDef] : []),
      ]
    },
  },
  ...OPERATIONS_ROUTES.map(
    (path, index): RoutePattern => ({
      priority: 50 - index,
      match: (p) => p === path,
      segments: () => [
        overviewCrumb(),
        { labelKey: 'nav.tools', path: ROUTE_PATHS.monitor, icon: Wrench },
        { labelKey: OPERATIONS_ROUTE_I18N[path] },
      ],
    }),
  ),
]

/** Resolve breadcrumb segment definitions for a pathname (labels not yet translated). */
export function matchBreadcrumbSegments(pathname: string): BreadcrumbSegmentDef[] {
  const normalized = pathname.replace(/\/$/, '') || '/'
  const pattern = [...ROUTE_PATTERNS]
    .sort((a, b) => b.priority - a.priority)
    .find((p) => p.match(normalized))
  if (pattern) {
    return pattern.segments(normalized)
  }

  const segment = normalized.split('/').filter(Boolean).pop()
  return [overviewCrumb(), { label: segment ?? normalized }]
}
