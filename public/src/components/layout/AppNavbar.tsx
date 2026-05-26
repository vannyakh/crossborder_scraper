import { Box, HStack, IconButton } from '@chakra-ui/react'
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useUiStore } from '../../stores/ui-store'
import { ThemeToggle } from '../ui/ThemeToggle'
import { AccountMenu } from './AccountMenu'
import { SHELL_HEADER_HEIGHT } from './constants'

function SidebarToggle({ compact }: { compact?: boolean }) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  return (
    <IconButton
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      size="sm"
      variant="ghost"
      colorPalette="blue"
      borderRadius="input"
      onClick={toggleSidebar}
    >
      {compact ? (
        <MenuIcon size={18} strokeWidth={2} />
      ) : sidebarCollapsed ? (
        <PanelLeftOpen size={18} strokeWidth={2} />
      ) : (
        <PanelLeftClose size={18} strokeWidth={2} />
      )}
    </IconButton>
  )
}

export function AppNavbar() {
  return (
    <Box
      as="header"
      h={SHELL_HEADER_HEIGHT}
      flexShrink={0}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="bg.navbar"
      px={{ base: 3, md: 4 }}
    >
      <HStack h="full" justify="space-between" gap={2}>
        <HStack gap={1} flexShrink={0}>
          <Box display={{ base: 'block', lg: 'none' }}>
            <SidebarToggle compact />
          </Box>
          <Box display={{ base: 'none', lg: 'block' }}>
            <SidebarToggle />
          </Box>
        </HStack>

        <HStack gap={1} flexShrink={0}>
          <ThemeToggle compact />
          <AccountMenu />
        </HStack>
      </HStack>
    </Box>
  )
}
