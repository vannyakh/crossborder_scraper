import {
  Bot,
  FolderOpen,
  HeartPulse,
  Layers,
  LifeBuoy,
  Package,
  Play,
  ScrollText,
  Settings,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { LLMHealth, RuntimeStatus, ServiceGatewaySummary } from '../lib/api'

/** Sidebar + dashboard: scrape pipeline outputs */
export const DATA_TOOL_NAV = [
  { to: '/batches', label: 'Batches' },
  { to: '/products', label: 'Products' },
  { to: '/files', label: 'Files' },
] as const

/** Sidebar + dashboard: panel diagnostics & help */
export const OPERATIONS_TOOL_NAV = [
  { to: '/store', label: 'App Store' },
  { to: '/logs', label: 'Logs' },
  { to: '/health', label: 'Health' },
  { to: '/support', label: 'Support' },
] as const

export const SOFTWARE_TOOL_ICONS = {
  batches: Play,
  products: Package,
  files: FolderOpen,
  agent: Bot,
  settings: Settings,
  workflows: Layers,
  health: HeartPulse,
  logs: ScrollText,
  support: LifeBuoy,
  tools: Wrench,
} as const satisfies Record<string, LucideIcon>

export type SoftwareToolIconKey = keyof typeof SOFTWARE_TOOL_ICONS

export type SoftwareToolCard = {
  id: string
  title: string
  description: string
  to: string
  status: string
  statusTone: 'success' | 'running' | 'neutral' | 'danger'
  icon: LucideIcon
  primaryAction?: { label: string; to: string }
}

export type SoftwareToolSection = {
  id: 'data' | 'operations' | 'automation'
  title: string
  description: string
  tools: SoftwareToolCard[]
}

export type DashboardToolStats = {
  runtime?: RuntimeStatus
  llm?: LLMHealth
  gateway?: ServiceGatewaySummary
  runningBatches: number
  products: number
  files: number
  enabledSchedules: number
  recentFailures: number
}

function card(
  partial: Omit<SoftwareToolCard, 'icon'> & { icon: SoftwareToolIconKey },
): SoftwareToolCard {
  return { ...partial, icon: SOFTWARE_TOOL_ICONS[partial.icon] }
}

/** Dashboard “Software tools” cards grouped by use case */
export function buildSoftwareToolSections(stats: DashboardToolStats): SoftwareToolSection[] {
  const { runtime, llm, runningBatches, products, files, enabledSchedules, recentFailures } = stats
  const aiAgentOn = runtime?.ai?.ai_agent_enabled

  return [
    {
      id: 'data',
      title: 'Scrape & catalog',
      description: 'Submit jobs, browse products, download export files',
      tools: [
        card({
          id: 'batches',
          icon: 'batches',
          title: 'Scrape batches',
          description: 'Submit URLs, track live progress, and cancel runs.',
          to: '/batches',
          status: runningBatches > 0 ? `${runningBatches} running` : 'Idle',
          statusTone: runningBatches > 0 ? 'running' : 'neutral',
          primaryAction: { label: 'New batch', to: '/batches' },
        }),
        card({
          id: 'products',
          icon: 'products',
          title: 'Product catalog',
          description: 'Browse scraped items and export to marketplaces.',
          to: '/products',
          status: `${products} items`,
          statusTone: 'neutral',
        }),
        card({
          id: 'files',
          icon: 'files',
          title: 'Output files',
          description: 'CSV/JSON exports and generated listing files on disk.',
          to: '/files',
          status: `${files} files`,
          statusTone: 'neutral',
        }),
      ],
    },
    {
      id: 'operations',
      title: 'Panel operations',
      description: 'Audit trail, health probes, and support shortcuts',
      tools: [
        card({
          id: 'store',
          icon: 'tools',
          title: 'App Store',
          description: 'Install Redis, PostgreSQL, MySQL, MongoDB, and more via Docker.',
          to: '/store',
          status: 'Plugins',
          statusTone: 'neutral',
        }),
        card({
          id: 'logs',
          icon: 'logs',
          title: 'Logs',
          description: 'Operation, scrape run, and cron agent events.',
          to: '/logs',
          status: 'Audit trail',
          statusTone: 'neutral',
        }),
        card({
          id: 'health',
          icon: 'health',
          title: 'Health',
          description: 'Engine, gateway agent summary, LLM probe, active batches.',
          to: '/health',
          status: llm?.ok ? 'LLM OK' : runtime?.ai?.ai_enabled ? 'Check LLM' : 'Engine',
          statusTone: llm?.ok ? 'success' : recentFailures > 0 ? 'danger' : 'neutral',
        }),
        card({
          id: 'support',
          icon: 'support',
          title: 'Support',
          description: 'Documentation links, build info, quick navigation.',
          to: '/support',
          status: runtime ? `v${runtime.version}` : 'Panel',
          statusTone: 'neutral',
        }),
      ],
    },
    {
      id: 'automation',
      title: 'Automation & config',
      description: 'AI gateway, workflows, and panel configuration',
      tools: [
        card({
          id: 'agent',
          icon: 'agent',
          title: 'Gateway agent',
          description: 'Chat, cron schedules, workflows, and tool catalog.',
          to: '/agent/chat',
          status:
            aiAgentOn && enabledSchedules > 0
              ? `${enabledSchedules} schedules`
              : aiAgentOn
                ? 'Ready'
                : 'Off',
          statusTone: aiAgentOn ? 'success' : 'neutral',
          primaryAction: { label: 'Chat', to: '/agent/chat' },
        }),
        card({
          id: 'workflows',
          icon: 'workflows',
          title: 'Workflows',
          description: 'Scrape→export pipelines and catalog snapshots.',
          to: '/agent/workflows',
          status: stats.gateway ? `${stats.gateway.workflows_count} templates` : 'Templates',
          statusTone: 'neutral',
        }),
        card({
          id: 'settings',
          icon: 'settings',
          title: 'Configuration',
          description: 'AI, scrape engine, proxy, pricing, marketplaces.',
          to: '/settings/ai',
          status: llm?.ok ? 'LLM OK' : runtime?.ai?.ai_enabled ? 'Check LLM' : 'Panel',
          statusTone: llm?.ok ? 'success' : 'neutral',
        }),
      ],
    },
  ]
}
