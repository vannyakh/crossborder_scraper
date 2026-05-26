import { Box, Menu, Portal, Text } from '@chakra-ui/react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavChildLink } from '../../config/nav'
import { isPathActive } from '../../config/nav'
import { SidebarNavItem } from './SidebarNavItem'

type SidebarFlyoutMenuProps = {
  label: string
  icon: LucideIcon
  active: boolean
  children: NavChildLink[]
  onNavigate?: () => void
}

export function SidebarFlyoutMenu({
  label,
  icon,
  active,
  children,
  onNavigate,
}: SidebarFlyoutMenuProps) {
  const location = useLocation()

  return (
    <Menu.Root positioning={{ placement: 'right-start', gutter: 10 }}>
      <Menu.Trigger asChild>
        <Box as="span" display="flex" justifyContent="center" w="full" cursor="pointer">
          <SidebarNavItem active={active} collapsed label={label} icon={icon} />
        </Box>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            className="sidebar-flyout"
            minW="9.5rem"
            py={1.5}
            px={1}
            borderRadius="var(--radius-panel)"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.elevated"
            shadow="lg"
            zIndex={40}
          >
            {children.map((child) => {
              const childActive = isPathActive(location.pathname, child.to, child.end)
              return (
                <Menu.Item
                  key={child.to}
                  value={child.to}
                  asChild
                  p={0}
                  bg="transparent"
                  _hover={{ bg: 'transparent' }}
                >
                  <NavLink
                    to={child.to}
                    end={child.end}
                    onClick={onNavigate}
                    className={`sidebar-flyout__link${childActive ? ' sidebar-flyout__link--active' : ''}`}
                  >
                    <Text fontSize="sm" fontWeight={childActive ? 'semibold' : 'normal'}>
                      {child.label}
                    </Text>
                  </NavLink>
                </Menu.Item>
              )
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
