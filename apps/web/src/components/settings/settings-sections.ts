import { Bot, Network, Palette, Shield, type LucideIcon } from 'lucide-react'

export type SettingsSectionId = 'panel' | 'network' | 'ai' | 'proxy'

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
    id: 'network',
    label: 'Network & security',
    description: 'Domain, entrance path, credentials, firewall',
    icon: Shield,
  },
  {
    id: 'ai',
    label: 'AI & LLM',
    description: 'Model, API key, extraction & agent',
    icon: Bot,
  },
  {
    id: 'proxy',
    label: 'Proxy & egress',
    description: 'HTTP/SOCKS, rotating pool, VPN, egress test',
    icon: Network,
  },
]

export const SETTINGS_SECTION_MAP = Object.fromEntries(
  SETTINGS_NAV.map((item) => [item.id, item]),
) as Record<SettingsSectionId, SettingsNavItem>

export { DEFAULT_SETTINGS_SECTION } from '../../routes/route-config'

export function isSettingsSectionId(value: string | undefined): value is SettingsSectionId {
  return value !== undefined && value in SETTINGS_SECTION_MAP
}

export function settingsSectionPath(section: SettingsSectionId): string {
  return `/settings/${section}`
}
