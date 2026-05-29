import { BarChart3, FileText, Settings, Workflow, type LucideIcon } from 'lucide-react'

export type ProjectSectionId = 'flow' | 'runtime' | 'logs' | 'settings'

export const DEFAULT_PROJECT_SECTION: ProjectSectionId = 'flow'

const PROJECT_SECTION_IDS: ProjectSectionId[] = ['flow', 'runtime', 'logs', 'settings']

export function isProjectSectionId(value: string | undefined): value is ProjectSectionId {
  return PROJECT_SECTION_IDS.includes(value as ProjectSectionId)
}

export type ProjectShellNavItem = {
  id: ProjectSectionId
  labelKey: string
  icon: LucideIcon
}

/** Project detail sidebar — not the main panel nav */
export const PROJECT_SHELL_NAV: ProjectShellNavItem[] = [
  { id: 'flow', labelKey: 'projects.sections.flow', icon: Workflow },
  { id: 'runtime', labelKey: 'projects.sections.runtime', icon: BarChart3 },
  { id: 'logs', labelKey: 'projects.sections.logs', icon: FileText },
  { id: 'settings', labelKey: 'projects.sections.settings', icon: Settings },
]
