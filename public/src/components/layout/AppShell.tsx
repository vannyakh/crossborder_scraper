import { Box, Flex, useBreakpointValue } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Outlet } from 'react-router-dom'
import { useMotionTransition } from '../../hooks/use-motion-props'
import { useStatsQuery } from '../../hooks/queries/use-stats-query'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useUiStore,
} from '../../stores/ui-store'
import { PageTransition } from '../motion/PageTransition'
import { AppNavbar } from './AppNavbar'
import {
  ShellBrandText,
  ShellFooter,
  ShellHeaderRow,
  ShellLogoMark,
  ShellMainContent,
  ShellScrollArea,
} from './ShellChrome'
import { SidebarNav } from './SidebarNav'

const MotionAside = motion.create(Box)
const MotionOverlay = motion.create(Box)

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <ShellHeaderRow justify={collapsed ? 'center' : 'flex-start'} bg="bg.sidebar">
      <ShellLogoMark collapsed={collapsed} label="Crossborder" />
      <ShellBrandText collapsed={collapsed} title="Crossborder" />
    </ShellHeaderRow>
  )
}

export function AppShell() {
  const { data: stats } = useStatsQuery()
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false
  const shellTransition = useMotionTransition(0.22)

  const navCollapsed = sidebarCollapsed && isDesktop
  const sidebarWidth = navCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
  const mobileOpen = !sidebarCollapsed && !isDesktop

  return (
    <Flex minH="100dvh" className="app-shell" position="relative" overflow="hidden">
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
        <SidebarHeader collapsed={navCollapsed} />

        <ShellScrollArea flex={1} px={navCollapsed ? 1 : 2} py={3}>
          <SidebarNav
            collapsed={navCollapsed}
            onNavigate={!isDesktop ? () => setSidebarCollapsed(true) : undefined}
          />
        </ShellScrollArea>

        <ShellFooter>
          {!navCollapsed && stats ? (
            <Box lineHeight="short" mb={1}>
              {stats.products} products · {stats.batches} batches
              {stats.running_batches > 0 ? ` · ${stats.running_batches} running` : ''}
            </Box>
          ) : null}
        </ShellFooter>
      </MotionAside>

      <Flex flex={1} minW={0} minH={0} direction="column" w="full">
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
