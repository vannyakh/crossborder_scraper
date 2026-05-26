import {
  Activity,
  Bot,
  FolderOpen,
  Home,
  Package,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { AGENT_NAV, agentSectionPath } from '../components/agent/agent-sections'
import { SERVICE_NAV, serviceSectionPath } from '../components/service/service-sections'

export type NavLinkItem = {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export type NavChildLink = {
  to: string
  label: string
  end?: boolean
  /** Roadmap / not yet available */
  soon?: boolean
}

export type NavGroupItem = {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  children: NavChildLink[]
}

export type NavEntry = NavLinkItem | NavGroupItem

const serviceNavChildren: NavChildLink[] = [
  ...SERVICE_NAV.map((item) => ({
    to: serviceSectionPath(item.id),
    label: item.label,
    soon: item.comingSoon,
  })),
  { to: '/logs', label: 'Logs' },
]

const agentNavChildren: NavChildLink[] = AGENT_NAV.map((item) => ({
  to: agentSectionPath(item.id),
  label: item.label,
}))

export const navEntries: NavEntry[] = [
  { kind: 'link', to: '/', label: 'Overview', icon: Home, end: true },
  {
    kind: 'group',
    id: 'data',
    label: 'Data',
    icon: Package,
    children: [
      { to: '/batches', label: 'Batches' },
      { to: '/products', label: 'Products' },
    ],
  },
  { kind: 'link', to: '/files', label: 'Files', icon: FolderOpen },
  {
    kind: 'group',
    id: 'service',
    label: 'Service',
    icon: Activity,
    children: serviceNavChildren,
  },
  {
    kind: 'group',
    id: 'agent',
    label: 'Agent',
    icon: Bot,
    children: agentNavChildren,
  },
  { kind: 'link', to: '/settings', label: 'Settings', icon: Settings },
]

/** @deprecated use navEntries */
export const navItems = navEntries

export function isPathActive(pathname: string, to: string, end?: boolean): boolean {
  if (end || to === '/') {
    return pathname === to
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function isGroupActive(pathname: string, children: NavChildLink[]): boolean {
  return children.some((c) => isPathActive(pathname, c.to, c.end))
}
