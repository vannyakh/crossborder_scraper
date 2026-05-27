import {
  Bot,
  Globe,
  Network,
  Palette,
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

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  description: string
  icon: LucideIcon
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: 'panel',
    label: 'Panel theme',
    description: 'Theme style, colors, logo, and backgrounds',
    icon: Palette,
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
]

export const SETTINGS_SECTION_MAP = Object.fromEntries(
  SETTINGS_NAV.map((item) => [item.id, item]),
) as Record<SettingsSectionId, SettingsNavItem>

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'ai'

export function isSettingsSectionId(value: string | undefined): value is SettingsSectionId {
  return value !== undefined && value in SETTINGS_SECTION_MAP
}

export function settingsSectionPath(section: SettingsSectionId): string {
  return `/settings/${section}`
}
