import { Box, Grid, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Section, SectionCard, SectionDivider } from '../ui/Section'

/** Pulsing rectangular block — wraps Chakra Skeleton with sensible defaults */
export function Bone({
  w = 'full',
  h = '14px',
  radius = 'var(--radius-card)',
}: {
  w?: string | number
  h?: string | number
  radius?: string
}) {
  return <Skeleton width={w} height={h} borderRadius={radius} />
}

/** Section header placeholder: divider line + subtitle line */
export function SectionHeadingSkeleton() {
  return (
    <Box>
      <HStack gap={2} align="center">
        <Box w={6} minW={6} borderTopWidth="1px" borderColor="border.subtle" />
        <Bone w="120px" h="16px" />
        <Box flex={1} borderTopWidth="1px" borderColor="border.subtle" />
      </HStack>
      <Bone w="200px" h="12px" radius="sm" />
    </Box>
  )
}

/** Single gauge tile skeleton matching ServiceGaugeTile / HardwareGaugeHoverCard */
export function GaugeTileSkeleton() {
  return (
    <Box
      p={3}
      borderRadius="var(--radius-card)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.elevated"
      minH="120px"
    >
      <Bone w="60px" h="14px" />
      <Bone w="110px" h="11px" radius="sm" />
      {/* gauge circle placeholder */}
      <Box mt={3} display="flex" justifyContent="center">
        <Bone w="80px" h="80px" radius="full" />
      </Box>
    </Box>
  )
}

/** 4-column gauge row (hardware / service) */
export function GaugeRowSkeleton({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box mt={0}>
      <SectionDivider title={title} />
      {subtitle ? <Bone w="180px" h="12px" radius="sm" /> : null}
      <Box pt={subtitle ? 3 : 2.5}>
        <Grid
          templateColumns={{ base: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }}
          gap={3}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <GaugeTileSkeleton key={i} />
          ))}
        </Grid>
      </Box>
    </Box>
  )
}

/** Overview column skeleton */
function OverviewColSkeleton() {
  return (
    <Box px={{ base: 3, md: 4 }} py={4}>
      <HStack gap={2} mb={2}>
        <Bone w="28px" h="28px" radius="var(--radius-card)" />
        <Bone w="80px" h="14px" />
      </HStack>
      <VStack align="stretch" gap={2.5}>
        {Array.from({ length: 4 }).map((_, i) => (
          <HStack key={i} justify="space-between">
            <Bone w="55px" h="11px" radius="sm" />
            <Bone w="36px" h="11px" radius="sm" />
          </HStack>
        ))}
      </VStack>
    </Box>
  )
}

/** 5-column overview grid skeleton */
export function OverviewSkeleton() {
  return (
    <Section title="Overview" description="Runtime snapshot across scrape, AI, and data" mt={5}>
      <SectionCard p={0}>
        <Grid
          templateColumns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(5, 1fr)' }}
          gap={0}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <OverviewColSkeleton key={i} />
          ))}
        </Grid>
      </SectionCard>
    </Section>
  )
}

/** Tool card skeleton */
export function ToolCardSkeleton() {
  return (
    <Box
      p={3}
      borderRadius="var(--radius-card)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.elevated"
      h="full"
    >
      <HStack gap={2} mb={2}>
        <Bone w="30px" h="30px" radius="var(--radius-card)" />
        <Bone w="90px" h="14px" />
      </HStack>
      <SkeletonText noOfLines={2} gap={1.5} mt={2} />
      <Bone w="60px" h="20px" radius="sm" />
      <Grid templateColumns="1fr 1fr" gap={2} mt={3}>
        <Bone h="28px" radius="var(--radius-input)" />
        <Bone h="28px" radius="var(--radius-input)" />
      </Grid>
    </Box>
  )
}

/** Full tools panel skeleton — 3 sections × 3 cards */
export function ToolsPanelSkeleton() {
  return (
    <Section title="Software tools" description="Loading panels…" mt={0}>
      <VStack align="stretch" gap={6}>
        {Array.from({ length: 2 }).map((_, si) => (
          <Box key={si}>
            <Bone w="140px" h="14px" />
            <Bone w="220px" h="11px" radius="sm" />
            <Grid
              templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }}
              gap={3}
              mt={3}
            >
              {Array.from({ length: 3 }).map((_, ci) => (
                <ToolCardSkeleton key={ci} />
              ))}
            </Grid>
          </Box>
        ))}
      </VStack>
    </Section>
  )
}

/** Chart panel skeleton */
export function ChartPanelSkeleton({ title }: { title: string }) {
  return (
    <Section title={title} mt={0}>
      <SectionCard>
        <Grid
          templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}
          gap={0}
          mb={4}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-card)"
          overflow="hidden"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} p={3} borderRightWidth={i < 3 ? '1px' : 0} borderColor="border.subtle">
              <Bone w="50px" h="11px" radius="sm" />
              <Bone w="70px" h="20px" radius="sm" />
            </Box>
          ))}
        </Grid>
        <Bone h="min(360px, 42vh)" radius="var(--radius-card)" />
      </SectionCard>
    </Section>
  )
}

/** Stats bar skeleton (LiveStatsBar) */
export function StatsBarSkeleton() {
  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={3}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box
          key={i}
          p={3}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.elevated"
        >
          <Bone w="70px" h="11px" radius="sm" />
          <Bone w="50px" h="22px" radius="sm" />
          <Bone w="90px" h="10px" radius="sm" />
        </Box>
      ))}
    </Grid>
  )
}

export function CardShell({
  children,
  loading,
  skeleton,
}: {
  children: ReactNode
  loading: boolean
  skeleton: ReactNode
}) {
  return <>{loading ? skeleton : children}</>
}
