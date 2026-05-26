import { Box, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { SETTINGS_NAV, type SettingsSectionId } from './settings-sections'
import { SHELL_HEADER_HEIGHT } from '../layout/constants'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'

const MotionButton = motion.button

function SettingsNavItem({
  active,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  description: string
  icon: LucideIcon
  onClick: () => void
}) {
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.16)

  return (
    <MotionButton
      type="button"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        width: '100%',
        textAlign: 'left',
        padding: '0.625rem',
        borderRadius: 'var(--radius-input)',
        border: active
          ? '1px solid color-mix(in srgb, var(--app-accent) 35%, transparent)'
          : '1px solid transparent',
        color: active ? 'var(--app-accent)' : 'var(--chakra-colors-fg-muted)',
        background: active ? 'var(--nav-active-bg)' : 'transparent',
        cursor: 'pointer',
      }}
      initial={false}
      whileHover={
        motionEnabled
          ? {
              x: 2,
            }
          : undefined
      }
      whileTap={motionEnabled ? { scale: 0.98 } : undefined}
      transition={transition}
      onClick={onClick}
    >
      <Box pt={0.5} flexShrink={0} lineHeight={0}>
        <Icon size={16} strokeWidth={active ? 2.25 : 2} />
      </Box>
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight={active ? 'semibold' : 'medium'} lineClamp={1}>
          {label}
        </Text>
        <Text fontSize="xs" color="fg.muted" display={{ base: 'none', xl: 'block' }} lineClamp={1} truncate title={description}>
          {description}
        </Text>
      </Box>
    </MotionButton>
  )
}

export function SettingsSidebar({
  active,
  onChange,
}: {
  active: SettingsSectionId
  onChange: (id: SettingsSectionId) => void
}) {
  const stickyMaxH = `calc(100dvh - ${SHELL_HEADER_HEIGHT} - var(--shell-padding) * 2)`

  return (
    <Box
      flexShrink={0}
      w={{ base: 'full', lg: '240px' }}
      position={{ lg: 'sticky' }}
      top={{ lg: 0 }}
      alignSelf="flex-start"
      zIndex={2}
      maxH={{ lg: stickyMaxH }}
      display="flex"
      flexDirection="column"
    >
      <Box
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-panel)"
        bg="bg.elevated"
        p={2}
        display="flex"
        flexDirection="column"
        minH={0}
        maxH={{ lg: stickyMaxH }}
        overflow="hidden"
        boxShadow="sm"
      >
        <Text px={2} py={1} fontSize="xs" fontWeight="semibold" color="fg.muted" flexShrink={0}>
          Configuration
        </Text>

        {/* Mobile: horizontal scroll tabs */}
        <Box
          display={{ base: 'block', lg: 'none' }}
          overflowX="auto"
          overflowY="hidden"
          className="app-scroll"
          mx={-1}
          px={1}
          pb={1}
          flexShrink={0}
        >
          <Box display="flex" gap={2} minW="max-content">
            {SETTINGS_NAV.map((item) => {
              const selected = active === item.id
              const Icon = item.icon
              return (
                <MotionButton
                  key={item.id}
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '9999px',
                    border: selected
                      ? '1px solid color-mix(in srgb, var(--app-accent) 40%, transparent)'
                      : '1px solid var(--chakra-colors-border-subtle)',
                    background: selected ? 'var(--nav-active-bg)' : 'var(--chakra-colors-bg-panel)',
                    color: selected ? 'var(--app-accent)' : 'var(--chakra-colors-fg-muted)',
                    fontSize: '0.875rem',
                    fontWeight: selected ? 600 : 500,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => onChange(item.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon size={14} strokeWidth={2} />
                  {item.label}
                </MotionButton>
              )
            })}
          </Box>
        </Box>

        {/* Desktop: vertical nav with scroll */}
        <Box
          display={{ base: 'none', lg: 'block' }}
          flex={1}
          minH={0}
          overflowY="auto"
          overflowX="hidden"
          className="app-scroll"
          mt={1}
        >
          <VStack align="stretch" gap={0.5}>
            {SETTINGS_NAV.map((item) => (
              <SettingsNavItem
                key={item.id}
                active={active === item.id}
                label={item.label}
                description={item.description}
                icon={item.icon}
                onClick={() => onChange(item.id)}
              />
            ))}
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}
