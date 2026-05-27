import { Box, Button, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavGroupItem } from '../../config/nav'
import { isGroupActive, isPathActive } from '../../config/nav'
import { useMotionTransition } from '../../hooks/use-motion-props'
import { SidebarFlyoutMenu } from './SidebarFlyoutMenu'
import { SidebarNavItem } from './SidebarNavItem'

const MotionBox = motion.create(Box)
const MotionChevron = motion.create(Box)

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
  const groupTransition = useMotionTransition(0.2)
  const showChildren = group.children.length > 0

  useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive, location.pathname])

  if (collapsed) {
    return (
      <SidebarFlyoutMenu
        label={group.label}
        description={group.description}
        icon={group.icon}
        active={groupActive}
        children={group.children}
        onNavigate={onNavigate}
      />
    )
  }

  const chevron = showChildren ? (
    <MotionChevron
      animate={{ rotate: open ? 180 : 0 }}
      transition={groupTransition}
      color="fg.muted"
      display="flex"
      as="span"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen((v) => !v)
      }}
      role="button"
      aria-label={open ? 'Collapse submenu' : 'Expand submenu'}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen((v) => !v)
        }
      }}
    >
      <ChevronDown size={16} strokeWidth={2} />
    </MotionChevron>
  ) : null

  const header = (
    <SidebarNavItem
      active={groupActive}
      collapsed={false}
      label={group.label}
      icon={group.icon}
      trailing={chevron}
    />
  )

  return (
    <Box>
      <Button
        variant="ghost"
        w="full"
        h="auto"
        minH="auto"
        p={0}
        borderRadius="var(--radius-input)"
        fontWeight="inherit"
        color="inherit"
        justifyContent="flex-start"
        _hover={{ bg: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={group.description}
      >
        {header}
      </Button>

      <AnimatePresence initial={false}>
        {open && showChildren ? (
          <MotionBox
            key={group.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={groupTransition}
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
                      title={child.description}
                    >
                      <SidebarNavItem
                        active={isPathActive(location.pathname, child.to, child.end)}
                        collapsed={false}
                        label={child.label}
                        indent
                        badge={child.badge}
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
