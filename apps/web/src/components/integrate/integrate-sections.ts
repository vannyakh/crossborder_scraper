import { Hash, Mail, MessageCircle, Send, type LucideIcon } from 'lucide-react'

export type IntegrateChannelId = 'telegram' | 'discord' | 'slack' | 'email'

export type IntegrateChannelItem = {
  id: IntegrateChannelId
  label: string
  description: string
  icon: LucideIcon
  /** When false, panel shows a coming-soon placeholder. */
  available: boolean
}

export const INTEGRATE_CHANNELS: IntegrateChannelItem[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Bot control chat — same gateway agent via Telegram',
    icon: Send,
    available: true,
  },
  {
    id: 'discord',
    label: 'Discord',
    description: 'Guild bot channel for gateway agent commands',
    icon: MessageCircle,
    available: true,
  },
  {
    id: 'slack',
    label: 'Slack',
    description: 'Workspace app channel for gateway agent commands',
    icon: Hash,
    available: true,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Inbound mailbox triggers for gateway agent workflows',
    icon: Mail,
    available: true,
  },
]

export const INTEGRATE_CHANNEL_MAP = Object.fromEntries(
  INTEGRATE_CHANNELS.map((item) => [item.id, item]),
) as Record<IntegrateChannelId, IntegrateChannelItem>

export { DEFAULT_INTEGRATE_CHANNEL } from '../../routes/route-config'

export function isIntegrateChannelId(value: string | undefined): value is IntegrateChannelId {
  return value !== undefined && value in INTEGRATE_CHANNEL_MAP
}

export function integrateSectionPath(channel: IntegrateChannelId): string {
  return `/integrate/${channel}`
}

export const INTEGRATE_PAGE_TITLE = 'Integrate'
