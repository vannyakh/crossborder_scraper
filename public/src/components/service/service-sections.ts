import {
  Activity,
  Bell,
  DatabaseBackup,
  HeartPulse,
  KeyRound,
  LifeBuoy,
  Plug,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react'

export type ServiceSectionId =
  | 'overview'
  | 'health'
  | 'support'
  | 'webhooks'
  | 'backups'
  | 'api-keys'
  | 'alerts'
  | 'team'
  | 'plugins'

export type ServiceNavGroup = 'monitor' | 'support' | 'roadmap'

export type ServiceNavItem = {
  id: ServiceSectionId
  label: string
  description: string
  icon: LucideIcon
  group: ServiceNavGroup
  comingSoon?: boolean
}

export const SERVICE_NAV_GROUPS: { id: ServiceNavGroup; label: string }[] = [
  { id: 'monitor', label: 'Monitor' },
  { id: 'support', label: 'Support' },
  { id: 'roadmap', label: 'Coming soon' },
]

export const SERVICE_NAV: ServiceNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Runtime, storage, and active jobs',
    icon: Activity,
    group: 'monitor',
  },
  {
    id: 'health',
    label: 'Health checks',
    description: 'LLM probe and service diagnostics',
    icon: HeartPulse,
    group: 'monitor',
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Docs, version info, and help',
    icon: LifeBuoy,
    group: 'support',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Batch complete & export callbacks',
    icon: Webhook,
    group: 'roadmap',
    comingSoon: true,
  },
  {
    id: 'backups',
    label: 'Backups',
    description: 'Scheduled DB and output snapshots',
    icon: DatabaseBackup,
    group: 'roadmap',
    comingSoon: true,
  },
  {
    id: 'api-keys',
    label: 'API keys',
    description: 'Programmatic panel access tokens',
    icon: KeyRound,
    group: 'roadmap',
    comingSoon: true,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Email and chat notifications',
    icon: Bell,
    group: 'roadmap',
    comingSoon: true,
  },
  {
    id: 'team',
    label: 'Team access',
    description: 'Multi-user roles and permissions',
    icon: Users,
    group: 'roadmap',
    comingSoon: true,
  },
  {
    id: 'plugins',
    label: 'Plugins',
    description: 'Custom exporters and site adapters',
    icon: Plug,
    group: 'roadmap',
    comingSoon: true,
  },
]

export const SERVICE_SECTION_MAP = Object.fromEntries(
  SERVICE_NAV.map((item) => [item.id, item]),
) as Record<ServiceSectionId, ServiceNavItem>

export const DEFAULT_SERVICE_SECTION: ServiceSectionId = 'overview'

export function isServiceSectionId(value: string | undefined): value is ServiceSectionId {
  return value !== undefined && value in SERVICE_SECTION_MAP
}

export function serviceSectionPath(section: ServiceSectionId): string {
  return `/service/${section}`
}

export function isServiceComingSoon(section: ServiceSectionId): boolean {
  return SERVICE_SECTION_MAP[section]?.comingSoon === true
}

export const COMING_SOON_BLURB =
  'This capability is on the roadmap. Configure scrape, AI, and export features in Settings while we ship the service console.'
