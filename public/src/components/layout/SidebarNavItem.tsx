import { HStack, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const MotionHStack = motion.create(HStack)

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

  return (
    <MotionHStack
      gap={2}
      px={collapsed ? 2 : 3}
      py={indent ? 1.5 : 2}
      justify={collapsed && showIcon ? 'center' : 'flex-start'}
      align="center"
      borderRadius="input"
      fontSize="sm"
      fontWeight={active ? 'semibold' : 'normal'}
      color={active ? 'nav.activeFg' : 'fg.muted'}
      bg={active ? 'bg.navActive' : 'transparent'}
      title={collapsed && showIcon ? label : undefined}
      initial={false}
      whileHover={{ x: collapsed && showIcon ? 0 : 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      _hover={{ bg: active ? 'bg.navActive' : 'bg.panelHover' }}
      w="full"
      textAlign="left"
    >
      {showIcon && Icon ? (
        <motion.span
          animate={{ scale: active ? 1.05 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex', lineHeight: 0, flexShrink: 0 }}
        >
          <Icon size={18} strokeWidth={active ? 2.25 : 2} aria-hidden />
        </motion.span>
      ) : null}

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: trailing ? 'auto' : '100%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
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
