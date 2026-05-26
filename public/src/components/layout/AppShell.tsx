import { Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { useStatsQuery } from '../../hooks/queries/use-stats-query'
import { PageTransition } from '../motion/PageTransition'
import { ThemeToggle } from '../ui/ThemeToggle'
import { StatusBadge } from '../ui/StatusBadge'

const MotionFlex = motion.create(Flex)

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/batches', label: 'Batches' },
  { to: '/products', label: 'Products' },
  { to: '/files', label: 'Files' },
] as const

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none', width: '100%' }}>
      {({ isActive }) => (
        <MotionFlex
          px={3}
          py={2.5}
          borderRadius="input"
          align="center"
          gap={2}
          fontSize="sm"
          fontWeight="medium"
          color={isActive ? 'nav.activeFg' : 'fg.muted'}
          bg={isActive ? 'nav.active' : 'transparent'}
          borderWidth="1px"
          borderColor={isActive ? 'brand.emphasis' : 'transparent'}
          _hover={{
            bg: isActive ? 'nav.active' : 'bg.panelHover',
            borderColor: isActive ? 'brand.emphasis' : 'border.subtle',
          }}
          whileHover={{ x: isActive ? 0 : 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          {label}
        </MotionFlex>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const { data: stats } = useStatsQuery()
  const { username, logout } = useAuth()

  return (
    <Flex minH="100dvh" className="app-mesh" direction={{ base: 'column', lg: 'row' }}>
      <Box
        as="aside"
        w={{ base: 'full', lg: '15.5rem' }}
        flexShrink={0}
        borderRightWidth={{ lg: '1px' }}
        borderColor="border.subtle"
        bg="bg.sidebar"
        backdropFilter="blur(16px)"
        p={{ base: 4, lg: 5 }}
        position={{ lg: 'sticky' }}
        top={0}
        h={{ lg: '100dvh' }}
        borderBottomWidth={{ base: '1px', lg: 0 }}
      >
        <VStack align="stretch" gap={6} h="full">
          <HStack justify="space-between" align="flex-start">
            <FadeInBrand />
            <ThemeToggle compact />
          </HStack>

          <Text fontSize="xs" color="fg.muted">
            Signed in as <strong>{username ?? 'operator'}</strong>
          </Text>

          {stats ? (
            <HStack gap={2} flexWrap="wrap">
              <StatusBadge status="brand" label={`${stats.products} products`} />
              <StatusBadge status="neutral" label={`${stats.batches} batches`} />
              {stats.running_batches > 0 ? (
                <StatusBadge status="running" label={`${stats.running_batches} live`} />
              ) : null}
            </HStack>
          ) : null}

          <VStack align="stretch" gap={1} flex={1}>
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
          </VStack>

          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            onClick={logout}
          >
            Sign out
          </Button>

          <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
            Playwright scrape engine · SQLite storage · marketplace export
          </Text>
        </VStack>
      </Box>

      <Box flex={1} p={{ base: 4, md: 6, xl: 8 }} maxW="6xl" w="full" mx="auto">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>
    </Flex>
  )
}

function FadeInBrand() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Text fontFamily="heading" fontWeight="extrabold" fontSize="lg" letterSpacing="-0.03em" className="brand-gradient-text">
        Crossborder
      </Text>
      <Text fontSize="xs" color="fg.muted" mt={0.5}>
        Scraper Control Center
      </Text>
    </motion.div>
  )
}
