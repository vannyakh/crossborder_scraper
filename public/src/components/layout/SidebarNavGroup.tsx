import { Box, Button, Menu, Portal, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavGroupItem } from '../../config/nav'
import { isGroupActive, isPathActive } from '../../config/nav'
import { SidebarNavItem } from './SidebarNavItem'

const MotionBox = motion.create(Box)
const MotionChevron = motion.create(Box)

/** Aligns tree line with parent nav icon center */
const TREE_LINE_LEFT = '1.375rem'

type SidebarNavGroupProps = {
  group: NavGroupItem
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarNavGroup({ group, collapsed, onNavigate }: SidebarNavGroupProps) {
  const location = useLocation()
  const groupActive = isGroupActive(location.pathname, group.children)
  const [open, setOpen] = useState(groupActive)

  useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive, location.pathname])

  if (collapsed) {
    return (
      <Menu.Root positioning={{ placement: 'right-start' }}>
        <Menu.Trigger asChild>
          <Box as="span" display="block" cursor="pointer">
            <SidebarNavItem
              active={groupActive}
              collapsed
              label={group.label}
              icon={group.icon}
            />
          </Box>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              minW="10rem"
              borderRadius="input"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.panel"
              py={1}
            >
              {group.children.map((child) => (
                <Menu.Item key={child.to} value={child.to} asChild>
                  <NavLink to={child.to} end={child.end} onClick={onNavigate}>
                    {child.label}
                  </NavLink>
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    )
  }

  const chevron = (
    <MotionChevron
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      color="fg.muted"
      display="flex"
    >
      <ChevronDown size={16} strokeWidth={2} />
    </MotionChevron>
  )

  return (
    <Box>
      <Button
        variant="ghost"
        w="full"
        h="auto"
        minH="auto"
        p={0}
        borderRadius="input"
        fontWeight="inherit"
        color="inherit"
        justifyContent="flex-start"
        _hover={{ bg: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <SidebarNavItem
          active={groupActive}
          collapsed={false}
          label={group.label}
          icon={group.icon}
          trailing={chevron}
        />
      </Button>

      <AnimatePresence initial={false}>
        {open ? (
          <MotionBox
            key={group.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
            overflow="hidden"
          >
            <Box position="relative" mt={0.5} role="group" aria-label={`${group.label} submenu`}>
              <Box
                aria-hidden
                position="absolute"
                left={TREE_LINE_LEFT}
                top={1}
                bottom={1}
                w="1px"
                bg="border.subtle"
                borderRadius="full"
              />
              <VStack align="stretch" gap={0.5} pl={7} pr={0}>
                {group.children.map((child) => (
                  <Box key={child.to} position="relative">
                    <Box
                      aria-hidden
                      position="absolute"
                      left="-0.375rem"
                      top="50%"
                      w="0.375rem"
                      h="1px"
                      bg="border.subtle"
                    />
                    <NavLink
                      to={child.to}
                      end={child.end}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onClick={onNavigate}
                    >
                      <SidebarNavItem
                        active={isPathActive(location.pathname, child.to, child.end)}
                        collapsed={false}
                        label={child.label}
                        indent
                      />
                    </NavLink>
                  </Box>
                ))}
              </VStack>
            </Box>
          </MotionBox>
        ) : null}
      </AnimatePresence>
    </Box>
  )
}
