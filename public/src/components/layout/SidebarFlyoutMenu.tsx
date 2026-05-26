import { Box, HStack, Menu, Portal, Text } from '@chakra-ui/react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavChildLink } from '../../config/nav'
import { isPathActive } from '../../config/nav'
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
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const triggerActive = active || open

  return (
    <Menu.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      positioning={{
        placement: 'right-start',
        gutter: 14,
        strategy: 'fixed',
        overlap: false,
      }}
    >
      <Menu.Trigger asChild>
        <button
          type="button"
          className="sidebar-flyout-trigger"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <SidebarNavItem active={triggerActive} collapsed label={label} icon={icon} />
        </button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner zIndex={50}>
          <Menu.Content
            className="sidebar-flyout"
            p={0}
            border="none"
            bg="transparent"
            boxShadow="none"
            minW={0}
            overflow="visible"
          >
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
                          setOpen(false)
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
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
