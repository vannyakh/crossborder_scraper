import { Box, HStack, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'

const MotionBox = motion.create(Box)
const MotionHStack = motion.create(HStack)

const COLLAPSED_ICON_SIZE = '2.5rem'

type SidebarNavItemProps = {
  active: boolean
  collapsed: boolean
  label: string
  icon?: LucideIcon
  indent?: boolean
  trailing?: ReactNode
}

export function SidebarNavItem({
  active,
  collapsed,
  label,
  icon: Icon,
  indent = false,
  trailing,
}: SidebarNavItemProps) {
  const showIcon = Boolean(Icon) && !indent
  const motionEnabled = useMotionEnabled()
  const itemTransition = useMotionTransition(0.15)
  const iconOnly = collapsed && showIcon && !trailing

  if (iconOnly && Icon) {
    return (
      <MotionBox
        className="sidebar-nav-icon"
        data-active={active ? '' : undefined}
        title={label}
        aria-label={label}
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={COLLAPSED_ICON_SIZE}
        h={COLLAPSED_ICON_SIZE}
        mx="auto"
        borderRadius="var(--radius-input)"
        color={active ? 'var(--app-accent)' : 'fg.muted'}
        bg={active ? 'var(--nav-active-bg)' : 'transparent'}
        boxShadow={
          active
            ? 'inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 40%, transparent)'
            : 'none'
        }
        flexShrink={0}
        initial={false}
        whileHover={motionEnabled ? { scale: 1.04 } : undefined}
        whileTap={motionEnabled ? { scale: 0.96 } : undefined}
        transition={itemTransition}
        _hover={{
          bg: active ? 'var(--nav-active-bg)' : 'bg.panelHover',
          color: active ? 'var(--app-accent)' : 'fg',
        }}
      >
        <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
      </MotionBox>
    )
  }

  return (
    <MotionHStack
      gap={2}
      px={collapsed ? 1 : 3}
      py={indent ? 1.5 : 2}
      justify={collapsed && showIcon ? 'center' : 'flex-start'}
      align="center"
      borderRadius="var(--radius-input)"
      fontSize="sm"
      fontWeight={active ? 'semibold' : 'normal'}
      color={active ? 'var(--app-accent)' : 'fg.muted'}
      bg={active ? 'var(--nav-active-bg)' : 'transparent'}
      title={collapsed && showIcon ? label : undefined}
      initial={false}
      whileHover={motionEnabled ? { x: collapsed && showIcon ? 0 : 2 } : undefined}
      whileTap={motionEnabled ? { scale: 0.98 } : undefined}
      transition={itemTransition}
      _hover={{
        bg: active ? 'var(--nav-active-bg)' : 'bg.panelHover',
        color: active ? 'var(--app-accent)' : 'fg',
      }}
      w="full"
      textAlign="left"
    >
      {showIcon && Icon ? (
        <motion.span
          animate={motionEnabled && active ? { scale: 1.05 } : { scale: 1 }}
          transition={itemTransition}
          style={{ display: 'flex', lineHeight: 0, flexShrink: 0 }}
        >
          <Icon size={18} strokeWidth={active ? 2.25 : 2} aria-hidden />
        </motion.span>
      ) : null}

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.span
            key="label"
            initial={motionEnabled ? { opacity: 0, width: 0 } : false}
            animate={{ opacity: 1, width: trailing ? 'auto' : '100%' }}
            exit={motionEnabled ? { opacity: 0, width: 0 } : undefined}
            transition={itemTransition}
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              flex: trailing ? 1 : undefined,
              minWidth: trailing ? 0 : undefined,
              textAlign: 'left',
              display: 'block',
            }}
          >
            <Text as="span" textAlign="left" w="full" display="block">
              {label}
            </Text>
          </motion.span>
        ) : null}
      </AnimatePresence>

      {!collapsed && trailing ? (
        <motion.span style={{ display: 'flex', flexShrink: 0 }}>{trailing}</motion.span>
      ) : null}
    </MotionHStack>
  )
}
