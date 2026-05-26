import { HStack, IconButton } from '@chakra-ui/react'
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useUiStore } from '../../stores/ui-store'
import { ThemeSettingsButton } from '../theme/ThemeSettingsDrawer'
import { uiRadius } from '../ui/ui-styles'
import { AccountMenu } from './AccountMenu'
import { ShellHeaderRow } from './ShellChrome'

function SidebarToggle({ compact }: { compact?: boolean }) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const accentPalette = useAccentPalette()

  return (
    <IconButton
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      size="sm"
      variant="ghost"
      colorPalette={accentPalette}
      {...uiRadius}
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
    <ShellHeaderRow as="header" justify="space-between">
      <HStack gap={1} flexShrink={0}>
        <HStack gap={1} display={{ base: 'flex', lg: 'none' }}>
          <SidebarToggle compact />
        </HStack>
        <HStack gap={1} display={{ base: 'none', lg: 'flex' }}>
          <SidebarToggle />
        </HStack>
      </HStack>

      <HStack gap={1} flexShrink={0}>
        <ThemeSettingsButton />
        <AccountMenu />
      </HStack>
    </ShellHeaderRow>
  )
}
