import { VStack } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { navEntries, isPathActive } from '../../config/nav'
import { SidebarNavGroup } from './SidebarNavGroup'
import { SidebarNavItem } from './SidebarNavItem'

type SidebarNavProps = {
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const location = useLocation()

  return (
    <VStack align="stretch" gap={0.5} flex={1} w="full">
      {navEntries.map((entry) => {
        if (entry.kind === 'group') {
          return (
            <SidebarNavGroup
              key={entry.id}
              group={entry}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )
        }

        const active = isPathActive(location.pathname, entry.to, entry.end)
        return (
          <NavLink
            key={entry.to}
            to={entry.to}
            end={entry.end}
            style={{
              textDecoration: 'none',
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'stretch',
              width: '100%',
            }}
            onClick={onNavigate}
          >
            <SidebarNavItem
              active={active}
              collapsed={collapsed}
              label={entry.label}
              icon={entry.icon}
            />
          </NavLink>
        )
      })}
    </VStack>
  )
}
