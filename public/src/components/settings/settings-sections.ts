import {
  Activity,
  Bot,
  Globe,
  Network,
  PanelTop,
  Store,
  Tags,
  type LucideIcon,
} from 'lucide-react'

export type SettingsSectionId =
  | 'panel'
  | 'ai'
  | 'scrape'
  | 'proxy'
  | 'pricing'
  | 'marketplaces'
  | 'service'

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  description: string
  icon: LucideIcon
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: 'panel',
    label: 'Panel',
    description: 'Config file and storage paths',
    icon: PanelTop,
  },
  {
    id: 'ai',
    label: 'AI & LLM',
    description: 'Model, API key, extraction & agent',
    icon: Bot,
  },
  {
    id: 'scrape',
    label: 'Scrape engine',
    description: 'Workers, browser, and timeouts',
    icon: Globe,
  },
  {
    id: 'proxy',
    label: 'Proxy',
    description: 'Server URL, proxy list, rotation',
    icon: Network,
  },
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Markup and default currency',
    icon: Tags,
  },
  {
    id: 'marketplaces',
    label: 'Marketplaces',
    description: 'Export platform credentials',
    icon: Store,
  },
  {
    id: 'service',
    label: 'Service status',
    description: 'Runtime, LLM health, batches',
    icon: Activity,
  },
]

export const SETTINGS_SECTION_MAP = Object.fromEntries(
  SETTINGS_NAV.map((item) => [item.id, item]),
) as Record<SettingsSectionId, SettingsNavItem>
