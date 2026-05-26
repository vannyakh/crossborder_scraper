import { Bot, FolderOpen, Home, Package, ScrollText, Settings, type LucideIcon } from 'lucide-react'

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
}

export type NavGroupItem = {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  children: NavChildLink[]
}

export type NavEntry = NavLinkItem | NavGroupItem

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
  { kind: 'link', to: '/logs', label: 'Logs', icon: ScrollText },
  { kind: 'link', to: '/agent', label: 'Agent', icon: Bot },
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
