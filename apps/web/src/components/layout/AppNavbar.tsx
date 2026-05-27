import { HStack, IconButton } from '@chakra-ui/react'
import { ListIndentDecrease, ListIndentIncrease } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useUiStore } from '../../stores/ui-store'
import { ThemeSettingsButton } from '../theme/ThemeSettingsDrawer'
import { uiRadius } from '../ui/ui-styles'
import { AccountMenu } from './AccountMenu'
import { AppBreadcrumb } from './AppBreadcrumb'
import { NavDivider, NavHostInfo } from './NavHostInfo'
import { PanelUpdateButton } from './PanelUpdateButton'
import { ShellHeaderRow } from './ShellChrome'

function SidebarToggle({ compact }: { compact?: boolean }) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const accentPalette = useAccentPalette()
  const { t } = useLocale()

  return (
    <IconButton
      aria-label={sidebarCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
      size="sm"
      variant="ghost"
      colorPalette={accentPalette}
      {...uiRadius}
      onClick={toggleSidebar}
    >
      {compact ? (
        <ListIndentDecrease size={18} strokeWidth={2} />
      ) : sidebarCollapsed ? (
        <ListIndentIncrease size={18} strokeWidth={2} />
      ) : (
        <ListIndentDecrease size={18} strokeWidth={2} />
      )}
    </IconButton>
  )
}

export function AppNavbar() {
  return (
    <ShellHeaderRow as="header" justify="space-between" gap={3}>
      <HStack gap={2} flex={1} minW={0} align="center">
        <HStack gap={1} flexShrink={0}>
          <HStack gap={1} display={{ base: 'flex', lg: 'none' }}>
            <SidebarToggle compact />
          </HStack>
          <HStack gap={1} display={{ base: 'none', lg: 'flex' }}>
            <SidebarToggle />
          </HStack>
        </HStack>
        <AppBreadcrumb />
      </HStack>

      <HStack gap={0} flexShrink={0} align="center">
        <AccountMenu />
        <NavHostInfo />
        <NavDivider />
        <PanelUpdateButton />
        <ThemeSettingsButton />
      </HStack>
    </ShellHeaderRow>
  )
}
