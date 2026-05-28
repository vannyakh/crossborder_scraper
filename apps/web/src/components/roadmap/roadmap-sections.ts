import { Bell, DatabaseBackup, KeyRound, Plug, Users, Webhook, type LucideIcon } from 'lucide-react'

export type RoadmapFeatureId = 'webhooks' | 'backups' | 'api-keys' | 'alerts' | 'team' | 'plugins'

export type RoadmapFeature = {
  id: RoadmapFeatureId
  label: string
  description: string
  icon: LucideIcon
}

export const ROADMAP_FEATURES: RoadmapFeature[] = [
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Batch complete & export callbacks',
    icon: Webhook,
  },
  {
    id: 'backups',
    label: 'Backups',
    description: 'Scheduled DB and output snapshots',
    icon: DatabaseBackup,
  },
  {
    id: 'api-keys',
    label: 'API keys',
    description: 'Programmatic panel access tokens',
    icon: KeyRound,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Email and chat notifications',
    icon: Bell,
  },
  {
    id: 'team',
    label: 'Team access',
    description: 'Multi-user roles and permissions',
    icon: Users,
  },
  {
    id: 'plugins',
    label: 'Plugins',
    description: 'Custom exporters and site adapters',
    icon: Plug,
  },
]

export const ROADMAP_FEATURE_MAP = Object.fromEntries(
  ROADMAP_FEATURES.map((item) => [item.id, item]),
) as Record<RoadmapFeatureId, RoadmapFeature>

export function isRoadmapFeatureId(value: string | undefined): value is RoadmapFeatureId {
  return value !== undefined && value in ROADMAP_FEATURE_MAP
}

export function roadmapPath(id: RoadmapFeatureId): string {
  return `/roadmap/${id}`
}

export { DEFAULT_COMING_SOON_BLURB as COMING_SOON_BLURB } from '../ui/PanelComingSoon'
