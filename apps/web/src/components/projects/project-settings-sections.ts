import {
  AlertTriangle,
  BarChart3,
  Globe,
  Key,
  Plug,
  Server,
  Settings,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react'

export type ProjectSettingsSectionId =
  | 'general'
  | 'usage'
  | 'environments'
  | 'variables'
  | 'webhooks'
  | 'members'
  | 'tokens'
  | 'integrations'
  | 'danger'

export type ProjectSettingsNavItem = {
  id: ProjectSettingsSectionId
  labelKey: string
  icon: LucideIcon
  danger?: boolean
}

export const PROJECT_SETTINGS_NAV: ProjectSettingsNavItem[] = [
  { id: 'general', labelKey: 'projects.settings.nav.general', icon: Settings },
  { id: 'usage', labelKey: 'projects.settings.nav.usage', icon: BarChart3 },
  { id: 'environments', labelKey: 'projects.settings.nav.environments', icon: Server },
  { id: 'variables', labelKey: 'projects.settings.nav.variables', icon: Globe },
  { id: 'webhooks', labelKey: 'projects.settings.nav.webhooks', icon: Webhook },
  { id: 'members', labelKey: 'projects.settings.nav.members', icon: Users },
  { id: 'tokens', labelKey: 'projects.settings.nav.tokens', icon: Key },
  { id: 'integrations', labelKey: 'projects.settings.nav.integrations', icon: Plug },
  { id: 'danger', labelKey: 'projects.settings.nav.danger', icon: AlertTriangle, danger: true },
]

export const DEFAULT_PROJECT_SETTINGS_SECTION: ProjectSettingsSectionId = 'general'
