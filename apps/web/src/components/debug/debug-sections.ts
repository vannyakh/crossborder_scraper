import { Bug, ScrollText, Wrench, type LucideIcon } from 'lucide-react'

export type DebugSectionId = 'logs' | 'tools'

export type DebugNavItem = {
  id: DebugSectionId
  label: string
  description: string
  icon: LucideIcon
}

export const DEBUG_NAV: DebugNavItem[] = [
  {
    id: 'logs',
    label: 'Logs',
    description: 'Operation, scrape runs, and cron agent history',
    icon: ScrollText,
  },
  {
    id: 'tools',
    label: 'Tool catalog',
    description: 'Gateway tools the agent can call — names, descriptions, and JSON schemas',
    icon: Wrench,
  },
]

export const DEBUG_SECTION_MAP = Object.fromEntries(
  DEBUG_NAV.map((item) => [item.id, item]),
) as Record<DebugSectionId, DebugNavItem>

export const DEFAULT_DEBUG_SECTION: DebugSectionId = 'logs'

export function debugSectionPath(section: DebugSectionId = DEFAULT_DEBUG_SECTION): string {
  return `/debug/${section}`
}

export function isDebugSectionId(value: string | undefined): value is DebugSectionId {
  return value !== undefined && value in DEBUG_SECTION_MAP
}

export const DEBUG_PAGE_TITLE = 'Debug'
export const DEBUG_PAGE_ICON = Bug
