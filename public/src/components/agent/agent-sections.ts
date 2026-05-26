import {
  Bot,
  CalendarClock,
  History,
  Layers,
  MessageSquare,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type AgentSectionId = 'chat' | 'schedules' | 'runs' | 'workflows' | 'tools'

export type AgentNavGroup = 'channel' | 'data' | 'automation'

export type AgentNavItem = {
  id: AgentSectionId
  label: string
  description: string
  icon: LucideIcon
  group: AgentNavGroup
}

export const AGENT_NAV_GROUPS: { id: AgentNavGroup; label: string }[] = [
  { id: 'channel', label: 'Agent channel' },
  { id: 'data', label: 'Run history' },
  { id: 'automation', label: 'Automation' },
]

export const AGENT_NAV: AgentNavItem[] = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Send prompts and inspect tool traces',
    icon: MessageSquare,
    group: 'channel',
  },
  {
    id: 'schedules',
    label: 'Schedules',
    description: 'Cron job table — add tasks, execute cycle, run on server',
    icon: CalendarClock,
    group: 'channel',
  },
  {
    id: 'runs',
    label: 'Run history',
    description: 'Manual and scheduled agent executions',
    icon: History,
    group: 'data',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    description: 'Multi-step scrape and export pipelines',
    icon: Layers,
    group: 'automation',
  },
  {
    id: 'tools',
    label: 'Tool catalog',
    description: 'Available gateway tools and parameters',
    icon: Wrench,
    group: 'automation',
  },
]

export const AGENT_SECTION_MAP = Object.fromEntries(
  AGENT_NAV.map((item) => [item.id, item]),
) as Record<AgentSectionId, AgentNavItem>

export const DEFAULT_AGENT_SECTION: AgentSectionId = 'chat'

export function isAgentSectionId(value: string | undefined): value is AgentSectionId {
  return value !== undefined && value in AGENT_SECTION_MAP
}

export function agentSectionPath(section: AgentSectionId): string {
  return `/agent/${section}`
}

export const AGENT_PAGE_TITLE = 'Gateway Agent'
export const AGENT_PAGE_ICON = Bot
