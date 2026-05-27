import { VStack } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { isPathActive } from '../../config/nav'
import { useNavEntries } from '../../hooks/use-nav-entries'
import { formatScrapeBadge } from '../../config/scrape-panel'
import { useStatsQuery } from '../../hooks/queries/use-stats-query'
import { SidebarNavGroup } from './SidebarNavGroup'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarNavSection } from './SidebarNavSection'

type SidebarNavProps = {
  collapsed: boolean
  onNavigate?: () => void
}

function resolveBadge(
  badgeKey: Parameters<typeof formatScrapeBadge>[0] | undefined,
  stats: { running_batches: number; products: number; output_files: number } | undefined,
): string | undefined {
  if (!badgeKey || !stats) return undefined
  return formatScrapeBadge(badgeKey, stats)
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const location = useLocation()
  const { data: stats } = useStatsQuery()
  const navEntries = useNavEntries()

  return (
    <VStack align="stretch" gap={0.5} flex={1} w="full">
      {navEntries.map((entry) => {
        if (entry.kind === 'section') {
          return <SidebarNavSection key={entry.id} label={entry.label} collapsed={collapsed} />
        }

        if (entry.kind === 'group') {
          const children = entry.children.map((child) => ({
            ...child,
            badge: resolveBadge(child.badgeKey, stats),
          }))
          return (
            <SidebarNavGroup
              key={entry.id}
              group={{ ...entry, children }}
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
            title={entry.description}
          >
            <SidebarNavItem
              active={active}
              collapsed={collapsed}
              label={entry.label}
              icon={entry.icon}
              badge={resolveBadge(entry.badgeKey, stats)}
            />
          </NavLink>
        )
      })}
    </VStack>
  )
}
