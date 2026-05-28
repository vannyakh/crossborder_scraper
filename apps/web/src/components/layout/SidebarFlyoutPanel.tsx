import { Box, HStack, Text } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavChildLink } from '../../config/nav'
import { isPathActive } from '../../config/nav'

type SidebarFlyoutPanelProps = {
  label: string
  description?: string
  children: NavChildLink[]
  onNavigate?: () => void
  onItemClick?: () => void
}

export function SidebarFlyoutPanel({
  label,
  description,
  children,
  onNavigate,
  onItemClick,
}: SidebarFlyoutPanelProps) {
  const location = useLocation()

  return (
    <Box className="sidebar-flyout__panel" role="menu" aria-label={label}>
      <Text className="sidebar-flyout__title" as="p">
        {label}
      </Text>
      {description ? (
        <Text fontSize="xs" color="fg.muted" px={3} pb={2} lineHeight="short">
          {description}
        </Text>
      ) : null}

      <Box className="sidebar-flyout__list">
        {children.map((child, index) => {
          const childActive = isPathActive(location.pathname, child.to, child.end)
          return (
            <Box key={child.to}>
              {index > 0 ? <Box className="sidebar-flyout__divider" aria-hidden /> : null}
              <NavLink
                to={child.to}
                end={child.end}
                role="menuitem"
                title={child.description}
                onClick={() => {
                  onNavigate?.()
                  onItemClick?.()
                }}
                className={({ isActive }) =>
                  [
                    'sidebar-flyout__link',
                    isActive || childActive ? 'sidebar-flyout__link--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                <HStack justify="space-between" w="full" gap={2}>
                  <Box minW={0}>
                    <Text fontSize="sm">{child.label}</Text>
                    {child.description ? (
                      <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                        {child.description}
                      </Text>
                    ) : null}
                  </Box>
                  {child.badge ? (
                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                      {child.badge}
                    </Text>
                  ) : null}
                </HStack>
              </NavLink>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
