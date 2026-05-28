import type { LucideIcon } from 'lucide-react'
import type { NavChildLink } from '../../config/nav'
import { SidebarCollapsedHover } from './SidebarCollapsedHover'
import { SidebarFlyoutPanel } from './SidebarFlyoutPanel'
import { SidebarNavItem } from './SidebarNavItem'

type SidebarFlyoutMenuProps = {
  label: string
  description?: string
  icon: LucideIcon
  active: boolean
  children: NavChildLink[]
  onNavigate?: () => void
}

export function SidebarFlyoutMenu({
  label,
  description,
  icon,
  active,
  children,
  onNavigate,
}: SidebarFlyoutMenuProps) {
  return (
    <SidebarCollapsedHover
      label={label}
      active={active}
      variant="menu"
      content={
        <SidebarFlyoutPanel
          label={label}
          description={description}
          children={children}
          onNavigate={onNavigate}
        />
      }
    >
      <SidebarNavItem active={active} collapsed label={label} icon={icon} />
    </SidebarCollapsedHover>
  )
}
