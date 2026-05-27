import { Box, Flex, useBreakpointValue } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Outlet } from 'react-router-dom'
import { useMotionTransition } from '../../hooks/use-motion-props'
import { useGatewayStatusQuery } from '../../hooks/queries/use-gateway-query'
import { usePanelAccessQuery } from '../../hooks/queries/use-panel-access-query'
import { useStatsQuery } from '../../hooks/queries/use-stats-query'
import { fallbackPanelAccess } from '../../lib/panel-access'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useUiStore,
} from '../../stores/ui-store'
import { PageTransition } from '../motion/PageTransition'
import { AppNavbar } from './AppNavbar'
import {
  BrandVersionBadge,
  ShellBrandText,
  ShellFooter,
  ShellHeaderRow,
  ShellLogoMark,
  ShellMainContent,
  ShellScrollArea,
} from './ShellChrome'
import { copyPanelAccess } from '../../lib/panel-access'
import { PanelAccessClip } from './PanelAccessClip'
import { RouteProgress } from './RouteProgress'
import { usePanelAppearance } from '../../hooks/use-panel-appearance'
import { SidebarNav } from './SidebarNav'

const MotionAside = motion.create(Box)
const MotionOverlay = motion.create(Box)

function SidebarHeader({
  collapsed,
  version,
  updateAvailable,
  onCopyCollapsed,
}: {
  collapsed: boolean
  version?: string
  updateAvailable?: boolean
  onCopyCollapsed?: () => void
}) {
  return (
    <ShellHeaderRow
      justify={collapsed ? 'center' : 'flex-start'}
      bg="bg.sidebar"
      flexDirection={collapsed ? 'column' : 'row'}
      gap={collapsed ? 1 : 2}
      py={collapsed ? 1.5 : undefined}
    >
      <ShellLogoMark
        collapsed={collapsed}
        label="Crossborder"
        onClick={onCopyCollapsed}
      />
      {collapsed ? (
        <BrandVersionBadge version={version} updateAvailable={updateAvailable} />
      ) : (
        <ShellBrandText
          collapsed={false}
          title="Crossborder"
          version={version}
          updateAvailable={updateAvailable}
        />
      )}
    </ShellHeaderRow>
  )
}

export function AppShell() {
  usePanelAppearance()
  const gateway = useGatewayStatusQuery()
  const { data: stats } = useStatsQuery()
  const panelAccess = usePanelAccessQuery()
  const access = panelAccess.data ?? fallbackPanelAccess()
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false
  const shellTransition = useMotionTransition(0.22)

  const navCollapsed = sidebarCollapsed && isDesktop
  const sidebarWidth = navCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
  const mobileOpen = !sidebarCollapsed && !isDesktop

  return (
    <Flex h="100dvh" maxH="100dvh" className="app-shell" position="relative" overflow="hidden">
      <RouteProgress />
      <AnimatePresence>
        {mobileOpen ? (
          <MotionOverlay
            key="backdrop"
            display={{ base: 'block', lg: 'none' }}
            position="fixed"
            inset={0}
            zIndex={20}
            bg="blackAlpha.600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shellTransition}
            onClick={() => setSidebarCollapsed(true)}
          />
        ) : null}
      </AnimatePresence>

      <MotionAside
        as="aside"
        className="app-sidebar"
        data-collapsed={navCollapsed ? '' : undefined}
        position={{ base: 'fixed', lg: 'sticky' }}
        top={0}
        left={0}
        zIndex={{ base: 30, lg: 1 }}
        h="100dvh"
        flexShrink={0}
        borderRightWidth="1px"
        borderColor="border.subtle"
        bg="bg.sidebar"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        initial={false}
        animate={{
          width: isDesktop ? sidebarWidth : SIDEBAR_WIDTH_EXPANDED,
          x: isDesktop ? 0 : sidebarCollapsed ? -SIDEBAR_WIDTH_EXPANDED : 0,
        }}
        transition={shellTransition}
      >
        <SidebarHeader
          collapsed={navCollapsed}
          version={gateway.data?.version}
          updateAvailable={gateway.data?.update_available}
          onCopyCollapsed={
            navCollapsed ? () => void copyPanelAccess(access) : undefined
          }
        />

        <ShellScrollArea flex={1} px={navCollapsed ? 1 : 2} py={2}>
          <SidebarNav
            collapsed={navCollapsed}
            onNavigate={!isDesktop ? () => setSidebarCollapsed(true) : undefined}
          />
        </ShellScrollArea>

        <ShellFooter py={2}>
          <PanelAccessClip access={access} collapsed={navCollapsed} />
          {!navCollapsed && stats ? (
            <Box lineHeight="short" mt={1.5} fontSize="2xs" opacity={0.85}>
              {stats.products} products · {stats.batches} batches
              {stats.running_batches > 0 ? ` · ${stats.running_batches} running` : ''}
            </Box>
          ) : null}
        </ShellFooter>
      </MotionAside>

      <Flex className="app-main-column panel-main-surface" direction="column" w="full">
        <AppNavbar />

        <ShellMainContent>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </ShellMainContent>
      </Flex>
    </Flex>
  )
}
