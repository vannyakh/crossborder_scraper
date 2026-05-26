import { Box, Flex, HStack, Text, useBreakpointValue } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Outlet } from 'react-router-dom'
import { useStatsQuery } from '../../hooks/queries/use-stats-query'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useUiStore,
} from '../../stores/ui-store'
import { PageTransition } from '../motion/PageTransition'
import { AppNavbar } from './AppNavbar'
import { SHELL_HEADER_HEIGHT } from './constants'
import { SidebarNav } from './SidebarNav'

const MotionAside = motion.create(Box)
const MotionOverlay = motion.create(Box)
const MotionBrand = motion.create(Box)

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <HStack
      h={SHELL_HEADER_HEIGHT}
      flexShrink={0}
      px={collapsed ? 2 : 4}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      justify={collapsed ? 'center' : 'flex-start'}
      overflow="hidden"
    >
      <MotionBrand
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <Text
          fontWeight="bold"
          fontSize={collapsed ? 'md' : 'sm'}
          lineHeight="1.2"
          color="brand.emphasis"
          whiteSpace="nowrap"
        >
          {collapsed ? 'C' : 'Crossborder'}
        </Text>
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="tagline"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Text fontSize="xs" color="fg.muted" lineHeight="1.2">
                Scraper
              </Text>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </MotionBrand>
    </HStack>
  )
}

export function AppShell() {
  const { data: stats } = useStatsQuery()
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false

  const navCollapsed = sidebarCollapsed && isDesktop
  const sidebarWidth = navCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
  const mobileOpen = !sidebarCollapsed && !isDesktop

  return (
    <Flex minH="100dvh" className="app-shell" position="relative">
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
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarCollapsed(true)}
          />
        ) : null}
      </AnimatePresence>

      <MotionAside
        as="aside"
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
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <SidebarBrand collapsed={navCollapsed} />

        <Box
          flex={1}
          px={navCollapsed ? 1 : 2}
          py={3}
          overflowY="auto"
          overflowX="hidden"
        >
          <SidebarNav
            collapsed={navCollapsed}
            onNavigate={!isDesktop ? () => setSidebarCollapsed(true) : undefined}
          />
        </Box>

        <Box
          px={navCollapsed ? 1 : 3}
          py={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
          fontSize="xs"
          color="fg.muted"
        >
          <AnimatePresence initial={false}>
            {!navCollapsed && stats ? (
              <motion.div
                key="stats"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Text mb={2} lineHeight="short">
                  {stats.products} products · {stats.batches} batches
                  {stats.running_batches > 0 ? ` · ${stats.running_batches} running` : ''}
                </Text>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Box>
      </MotionAside>

      <Flex flex={1} minW={0} direction="column" w="full">
        <AppNavbar />

        <Box as="main" flex={1} w="full" minW={0} p={{ base: 3, md: 5, xl: 6 }} overflowX="hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Box>
      </Flex>
    </Flex>
  )
}
