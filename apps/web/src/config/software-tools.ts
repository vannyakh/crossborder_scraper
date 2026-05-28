import {
  BookOpen,
  Bot,
  FolderOpen,
  HeartPulse,
  Layers,
  LifeBuoy,
  Package,
  Play,
  ScrollText,
  Settings,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { LLMHealth, RuntimeStatus, ServiceGatewaySummary } from '../lib/api'
import { SCRAPE_DASHBOARD_TOOLS, formatScrapeBadge, type ScrapeNavBadgeKey } from './scrape-panel'

/** Sidebar + dashboard: panel diagnostics & help */
export const OPERATIONS_TOOL_NAV = [
  { to: '/monitor', label: 'Live monitor' },
  { to: '/store', label: 'App Store' },
  { to: '/docker', label: 'Docker' },
  { to: '/firewall', label: 'Firewall' },
  { to: '/health', label: 'Health' },
  { to: '/guides', label: 'Guides' },
  { to: '/support', label: 'Support' },
] as const

export const DEBUG_TOOL_NAV = [
  { to: '/debug/logs', label: 'Logs' },
  { to: '/debug/tools', label: 'Tool catalog' },
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
  guides: BookOpen,
  tools: Wrench,
  skills: Sparkles,
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
  id: 'scrape' | 'operations' | 'debug' | 'automation'
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

function scrapeStatus(
  badgeKey: ScrapeNavBadgeKey,
  stats: { running_batches: number; products: number; output_files: number },
  runningBatches: number,
): { status: string; tone: SoftwareToolCard['statusTone'] } {
  const n = formatScrapeBadge(badgeKey, stats)
  switch (badgeKey) {
    case 'running_batches':
      return {
        status: runningBatches > 0 ? `${runningBatches} running` : 'Idle',
        tone: runningBatches > 0 ? 'running' : 'neutral',
      }
    case 'products':
      return { status: n ? `${n} items` : 'Empty', tone: 'neutral' }
    case 'output_files':
      return { status: n ? `${n} files` : 'Empty', tone: 'neutral' }
    default:
      return { status: '—', tone: 'neutral' }
  }
}

/** Dashboard “Software tools” cards grouped by use case */
export function buildSoftwareToolSections(stats: DashboardToolStats): SoftwareToolSection[] {
  const { runtime, llm, runningBatches, products, files, enabledSchedules, recentFailures } = stats
  const agentLlmOn = Boolean(runtime?.ai?.ai_enabled && runtime?.ai?.llm_ready)
  const scrapeStats = {
    running_batches: runningBatches,
    products,
    output_files: files,
  }

  const scrapeTools: SoftwareToolCard[] = SCRAPE_DASHBOARD_TOOLS.map((tool) => {
    const { status, tone } = scrapeStatus(tool.badgeKey, scrapeStats, runningBatches)
    const iconKey =
      tool.id === 'batch-queue' ? 'batches' : tool.id === 'catalog' ? 'products' : 'files'
    return card({
      id: tool.id,
      icon: iconKey,
      title: tool.title,
      description: tool.description,
      to: tool.to,
      status,
      statusTone: tone,
      primaryAction: 'primaryAction' in tool ? tool.primaryAction : undefined,
    })
  })

  return [
    {
      id: 'scrape',
      title: 'Scrape panel',
      description: 'Workflow jobs and scrape artifacts — same as the sidebar scrape section',
      tools: scrapeTools,
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
          id: 'health',
          icon: 'health',
          title: 'Health',
          description: 'Engine, gateway agent summary, LLM probe, active batches.',
          to: '/health',
          status: llm?.ok ? 'Agent LLM OK' : runtime?.ai?.ai_enabled ? 'Check agent LLM' : 'Engine',
          statusTone: llm?.ok ? 'success' : recentFailures > 0 ? 'danger' : 'neutral',
        }),
        card({
          id: 'guides',
          icon: 'guides',
          title: 'Guides',
          description: 'Setup instructions for agent LLM, scrape workflow, and panel tools.',
          to: '/guides',
          status: 'Setup docs',
          statusTone: 'neutral',
        }),
        card({
          id: 'support',
          icon: 'support',
          title: 'Support',
          description: 'Readiness checks, cron scheduler, and quick navigation.',
          to: '/support',
          status: runtime ? `v${runtime.version}` : 'Panel',
          statusTone: 'neutral',
        }),
      ],
    },
    {
      id: 'debug',
      title: 'Debug',
      description: 'Audit logs and gateway tool catalog for troubleshooting',
      tools: [
        card({
          id: 'logs',
          icon: 'logs',
          title: 'Logs',
          description: 'Operation, scrape run, and cron agent events.',
          to: '/debug/logs',
          status: 'Audit trail',
          statusTone: 'neutral',
        }),
        card({
          id: 'tool-catalog',
          icon: 'tools',
          title: 'Tool catalog',
          description: 'Gateway tools, parameters, and JSON schemas.',
          to: '/debug/tools',
          status: stats.gateway ? `${stats.gateway.tools_count ?? '—'} tools` : 'Gateway',
          statusTone: 'neutral',
        }),
      ],
    },
    {
      id: 'automation',
      title: 'Automation & config',
      description: 'AI gateway, agent pipelines, and panel configuration',
      tools: [
        card({
          id: 'telegram',
          icon: 'agent',
          title: 'Telegram bot',
          description: 'Control chat channel wired to the Cross-Border gateway agent.',
          to: '/integrate/telegram',
          status: stats.gateway?.telegram?.enabled
            ? 'Live'
            : stats.gateway?.telegram?.configured
              ? 'Ready'
              : 'Setup',
          statusTone: stats.gateway?.telegram?.enabled ? 'success' : 'neutral',
          primaryAction: { label: 'Telegram', to: '/integrate/telegram' },
        }),
        card({
          id: 'agent',
          icon: 'agent',
          title: 'Gateway agent',
          description: 'Chat, cron schedules, skills, and workflows.',
          to: '/agent/chat',
          status:
            agentLlmOn && enabledSchedules > 0
              ? `${enabledSchedules} schedules`
              : agentLlmOn
                ? 'Ready'
                : runtime?.ai?.ai_enabled
                  ? 'Check LLM'
                  : 'Off',
          statusTone: agentLlmOn ? 'success' : runtime?.ai?.ai_enabled ? 'neutral' : 'neutral',
          primaryAction: { label: 'Chat', to: '/agent/chat' },
        }),
        card({
          id: 'skills',
          icon: 'skills',
          title: 'Agent skills',
          description: 'Install SKILL.md packages — scrape, batch, catalog, export, panel ops.',
          to: '/agent/skills',
          status: stats.gateway?.skills_count
            ? `${stats.gateway.enabled_skills_count ?? 0}/${stats.gateway.skills_count} on`
            : 'SKILL.md',
          statusTone: agentLlmOn ? 'success' : 'neutral',
          primaryAction: { label: 'Skills', to: '/agent/skills' },
        }),
        card({
          id: 'workflows',
          icon: 'workflows',
          title: 'Agent pipelines',
          description: 'Multi-step scrape→export templates (gateway, not batch queue).',
          to: '/agent/workflows',
          status: stats.gateway ? `${stats.gateway.workflows_count} templates` : 'Templates',
          statusTone: 'neutral',
        }),
        card({
          id: 'network',
          icon: 'health',
          title: 'Network & firewall',
          description: 'Panel port, ufw, cloud security group checklist.',
          to: '/settings/network',
          status: 'VPS access',
          statusTone: 'neutral',
        }),
        card({
          id: 'settings',
          icon: 'settings',
          title: 'Configuration',
          description: 'Agent LLM, proxy, pricing, and marketplace credentials.',
          to: '/settings/ai',
          status: llm?.ok ? 'Agent LLM OK' : runtime?.ai?.ai_enabled ? 'Check agent LLM' : 'Panel',
          statusTone: llm?.ok ? 'success' : 'neutral',
        }),
      ],
    },
  ]
}
