import { Box, Grid, HStack, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Section, SectionCard } from '../ui/Section'
import { ShimmerBar, ShimmerBlock, ShimmerSurface } from '../ui/Shimmer'
import { PanelShell } from '../ui/PanelSkeleton'

const GAUGE_TILE = {
  p: 3,
  minH: '120px',
  borderRadius: 'var(--radius-card)',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  bg: 'bg.elevated',
} as const

/** Single gauge tile — matches ServiceGaugeTile / HardwareGaugeHoverCard layout */
export function GaugeTileSkeleton() {
  return (
    <ShimmerSurface {...GAUGE_TILE} display="flex" flexDirection="column">
      <ShimmerBlock w="52px" h="14px" />
      <ShimmerBlock w="72px" h="11px" radius="sm" mt={0.5} />
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="88px"
        mt={0}
      >
        <ShimmerBlock w="72px" h="72px" radius="full" />
      </Box>
    </ShimmerSurface>
  )
}

/** 4-column gauge row — title only */
export function GaugeRowSkeleton({
  title,
  footer,
}: {
  title: string
  footer?: boolean
}) {
  return (
    <Section title={title} mt={0}>
      <Grid
        templateColumns={{ base: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }}
        gap={3}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <GaugeTileSkeleton key={i} />
        ))}
      </Grid>
      {footer ? (
        <ShimmerBar w="min(280px, 65%)" h="11px" radius="sm" mt={2.5} />
      ) : null}
    </Section>
  )
}

function OverviewColSkeleton() {
  return (
    <Box px={{ base: 3, md: 4 }} py={3.5}>
      <HStack gap={2} mb={2}>
        <ShimmerBlock w="28px" h="28px" radius="var(--radius-card)" />
        <ShimmerBlock w="72px" h="14px" />
      </HStack>
      <VStack align="stretch" gap={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <HStack key={i} justify="space-between">
            <ShimmerBlock w="52px" h="11px" radius="sm" />
            <ShimmerBlock w="32px" h="11px" radius="sm" />
          </HStack>
        ))}
      </VStack>
    </Box>
  )
}

export function OverviewSkeleton() {
  return (
    <Section title="Overview" description="Runtime snapshot across scrape, AI, and data" mt={5}>
      <ShimmerSurface
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-panel)"
        bg="bg.elevated"
        overflow="hidden"
      >
        <Grid
          templateColumns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(5, 1fr)' }}
          gap={0}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <OverviewColSkeleton key={i} />
          ))}
        </Grid>
      </ShimmerSurface>
    </Section>
  )
}

export function ToolCardSkeleton() {
  return (
    <ShimmerSurface {...GAUGE_TILE} h="full" display="flex" flexDirection="column">
      <HStack gap={2}>
        <ShimmerBlock w="30px" h="30px" radius="var(--radius-card)" />
        <ShimmerBlock w="84px" h="14px" />
      </HStack>
      <VStack align="stretch" gap={1.5} mt={2} flex={1}>
        <ShimmerBlock w="full" h="11px" radius="sm" />
        <ShimmerBlock w="85%" h="11px" radius="sm" />
      </VStack>
      <ShimmerBlock w="56px" h="20px" radius="sm" mt={2} />
      <Grid templateColumns="1fr 1fr" gap={2} mt={2.5}>
        <ShimmerBlock h="28px" radius="var(--radius-input)" />
        <ShimmerBlock h="28px" radius="var(--radius-input)" />
      </Grid>
    </ShimmerSurface>
  )
}

export function ToolsPanelSkeleton() {
  return (
    <Section title="Software tools" mt={0}>
      <VStack align="stretch" gap={5}>
        {Array.from({ length: 2 }).map((_, si) => (
          <Box key={si}>
            <ShimmerBar w="128px" h="14px" radius="sm" />
            <ShimmerBar w="200px" h="11px" radius="sm" mt={1.5} />
            <Grid
              templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }}
              gap={3}
              mt={2.5}
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

export function ChartPanelSkeleton({ title }: { title: string }) {
  return (
    <Section title={title} mt={0}>
      <SectionCard p={{ base: 3, md: 4 }}>
        <ShimmerSurface
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-card)"
          overflow="hidden"
          mb={3}
        >
          <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={0}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                px={3}
                py={2.5}
                borderRightWidth={i < 3 ? '1px' : 0}
                borderColor="border.subtle"
              >
                <ShimmerBlock w="48px" h="11px" radius="sm" />
                <ShimmerBlock w="64px" h="18px" radius="sm" mt={1.5} />
              </Box>
            ))}
          </Grid>
        </ShimmerSurface>
        <ShimmerBar h="min(360px, 42vh)" radius="var(--radius-card)" />
      </SectionCard>
    </Section>
  )
}

export function StatsBarSkeleton() {
  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={3}>
      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerSurface key={i} {...GAUGE_TILE} minH="auto">
          <ShimmerBlock w="64px" h="11px" radius="sm" />
          <ShimmerBlock w="44px" h="22px" radius="sm" mt={1.5} />
          <ShimmerBlock w="80px" h="10px" radius="sm" mt={1} />
        </ShimmerSurface>
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
  return <PanelShell loading={loading} skeleton={skeleton}>{children}</PanelShell>
}
