import { Box, Grid, HStack, Table, VStack } from '@chakra-ui/react'
import { ShimmerBlock, ShimmerSurface } from '../ui/Shimmer'

const OBSERVE_SURFACE = {
  borderWidth: '1px',
  borderColor: 'border.subtle',
  borderRadius: 'var(--radius-panel)',
  bg: 'bg.elevated',
} as const

export function ProjectObservabilityHeaderSkeleton({
  statCount = 3,
  withActions = false,
}: {
  statCount?: number
  withActions?: boolean
}) {
  return (
    <Box
      className="project-observe-header"
      px={{ base: 3, md: 4 }}
      pt={{ base: 3, md: 4 }}
      pb={3}
      aria-hidden
    >
      <HStack align="flex-start" justify="space-between" gap={3} flexWrap="wrap">
        <HStack align="flex-start" gap={3} minW={0}>
          <ShimmerBlock w="36px" h="36px" radius="var(--radius-card)" flexShrink={0} />
          <VStack align="stretch" gap={1.5} minW={0}>
            <HStack gap={2}>
              <ShimmerBlock w="128px" h="18px" radius="sm" />
              <ShimmerBlock w="52px" h="20px" radius="full" />
            </HStack>
            <ShimmerBlock w="full" h="13px" radius="sm" maxW={{ base: '100%', md: '320px' }} />
          </VStack>
        </HStack>
        <HStack gap={2} flexWrap="wrap" flexShrink={0}>
          {Array.from({ length: statCount }).map((_, i) => (
            <ShimmerSurface key={i} className="project-observe-stat" px={3} py={2} minW="5.5rem">
              <ShimmerBlock w="48px" h="10px" radius="sm" />
              <ShimmerBlock w={`${32 + i * 8}px`} h="14px" radius="sm" mt={1.5} />
            </ShimmerSurface>
          ))}
          {withActions ? (
            <HStack gap={1}>
              <ShimmerBlock
                w="72px"
                h="2rem"
                radius="var(--radius-input)"
                display={{ base: 'none', md: 'block' }}
              />
              <ShimmerBlock w="88px" h="2rem" radius="var(--radius-input)" />
            </HStack>
          ) : null}
        </HStack>
      </HStack>
    </Box>
  )
}

function LogTabsSkeleton() {
  return (
    <HStack gap={2} mb={3} flexWrap="wrap" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerBlock key={i} w={`${68 + i * 12}px`} h="2rem" radius="var(--radius-input)" />
      ))}
    </HStack>
  )
}

function LogHistogramSkeleton() {
  return (
    <ShimmerSurface px={3} pb={3} aria-hidden>
      <HStack justify="space-between" mb={2} px={0.5} flexWrap="wrap" gap={2}>
        <ShimmerBlock w="88px" h="12px" radius="sm" />
        <HStack gap={3}>
          <ShimmerBlock w="72px" h="10px" radius="sm" />
          <ShimmerBlock w="64px" h="10px" radius="sm" />
        </HStack>
      </HStack>
      <ShimmerSurface
        className="project-logs-chart-brush-host"
        h="118px"
        borderRadius="var(--radius-card)"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.subtle"
        display="flex"
        alignItems="flex-end"
        gap={1}
        px={2}
        pb={2}
        pt={4}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            flex={1}
            h={`${28 + ((i * 7) % 40)}%`}
            radius="sm"
            minH="12px"
            opacity={0.55 + (i % 3) * 0.12}
          />
        ))}
      </ShimmerSurface>
    </ShimmerSurface>
  )
}

function LogTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <ShimmerSurface
      className="project-logs-table-wrap"
      flex={1}
      minH={0}
      overflow="hidden"
      {...OBSERVE_SURFACE}
      aria-hidden
    >
      <Table.Root size="sm" variant="line" className="project-logs-table">
        <Table.Header>
          <Table.Row>
            {['5.5rem', '6.5rem', '5rem', 'auto'].map((w, i) => (
              <Table.ColumnHeader key={i} w={w === 'auto' ? undefined : w}>
                <ShimmerBlock w={`${48 + i * 8}px`} h="11px" radius="sm" />
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Array.from({ length: rows }).map((_, ri) => (
            <Table.Row key={ri}>
              <Table.Cell py={2.5}>
                <ShimmerBlock w="52px" h="22px" radius="full" />
              </Table.Cell>
              <Table.Cell py={2.5}>
                <ShimmerBlock w="88px" h="11px" radius="sm" />
              </Table.Cell>
              <Table.Cell py={2.5}>
                <ShimmerBlock w="64px" h="22px" radius="full" />
              </Table.Cell>
              <Table.Cell py={2.5}>
                <ShimmerBlock
                  w={ri % 3 === 0 ? '92%' : ri % 3 === 1 ? '76%' : '64%'}
                  h="11px"
                  radius="sm"
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </ShimmerSurface>
  )
}

export function ProjectLogsPanelSkeleton({ label }: { label: string }) {
  return (
    <Box
      className="project-logs-panel project-logs-panel--skeleton"
      flex={1}
      minH={0}
      display="flex"
      flexDirection="column"
      aria-busy="true"
      aria-label={label}
    >
      <ProjectObservabilityHeaderSkeleton statCount={3} />

      <Box
        className="project-observe-body project-logs-body"
        flex={1}
        minH={0}
        display="flex"
        flexDirection="column"
        px={{ base: 3, md: 4 }}
        pb={3}
      >
        <LogTabsSkeleton />

        <ShimmerSurface className="project-logs-toolbar-card" mb={3} {...OBSERVE_SURFACE}>
          <HStack gap={2} flexWrap={{ base: 'wrap', lg: 'nowrap' }} p={3}>
            <ShimmerBlock
              flex={{ base: '1 1 100%', lg: 1 }}
              h="2rem"
              radius="var(--radius-input)"
              minW={0}
            />
            <Box flexShrink={0} w={{ base: 'full', sm: '9.5rem' }}>
              <ShimmerBlock w="full" h="2rem" radius="var(--radius-input)" />
            </Box>
            <HStack gap={1} flexShrink={0}>
              <ShimmerBlock
                w="72px"
                h="2rem"
                radius="var(--radius-input)"
                display={{ base: 'none', md: 'block' }}
              />
              <ShimmerBlock w="2rem" h="2rem" radius="var(--radius-input)" />
            </HStack>
          </HStack>
          <LogHistogramSkeleton />
        </ShimmerSurface>

        <LogTableSkeleton />
        <ShimmerBlock w="160px" h="10px" radius="sm" mt={2} px={0.5} />
      </Box>
    </Box>
  )
}

function RuntimeHostStateSkeleton() {
  return (
    <ShimmerSurface
      className="project-runtime-state-card"
      p={3}
      mb={0}
      {...OBSERVE_SURFACE}
      aria-hidden
    >
      <HStack justify="space-between" flexWrap="wrap" gap={2} mb={3}>
        <ShimmerBlock w="96px" h="14px" radius="sm" />
        <ShimmerBlock w="140px" h="11px" radius="sm" />
      </HStack>
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={3}>
        {Array.from({ length: 3 }).map((_, i) => (
          <HStack
            key={i}
            gap={3}
            p={2.5}
            borderWidth="1px"
            borderColor="border.muted"
            borderRadius="md"
          >
            <ShimmerBlock w="18px" h="18px" radius="sm" flexShrink={0} />
            <Box flex={1}>
              <ShimmerBlock w="40px" h="10px" radius="sm" />
              <ShimmerBlock w="48px" h="14px" radius="sm" mt={1.5} />
            </Box>
          </HStack>
        ))}
      </Grid>
    </ShimmerSurface>
  )
}

function RuntimeMetricCardSkeleton({ index }: { index: number }) {
  return (
    <ShimmerSurface className="project-runtime-metric-card" p={3} {...OBSERVE_SURFACE} aria-hidden>
      <HStack justify="space-between" align="flex-start" gap={2} mb={3}>
        <Box flex={1}>
          <HStack gap={2} mb={2}>
            <ShimmerBlock w={`${56 + index * 8}px`} h="14px" radius="sm" />
            <ShimmerBlock w="40px" h="20px" radius="full" />
          </HStack>
          <HStack gap={3}>
            <ShimmerBlock w="72px" h="11px" radius="sm" />
            <ShimmerBlock w="64px" h="11px" radius="sm" display={{ base: 'none', sm: 'block' }} />
          </HStack>
        </Box>
        <HStack gap={0}>
          <ShimmerBlock w="1.75rem" h="1.75rem" radius="sm" />
          <ShimmerBlock w="1.75rem" h="1.75rem" radius="sm" />
        </HStack>
      </HStack>
      <ShimmerSurface
        className="project-runtime-metric-card__chart"
        h="min(260px, 32vh)"
        minH="180px"
        borderRadius="var(--radius-card)"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.subtle"
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" inset="12% 8% 18% 8%">
          <ShimmerBlock w="full" h="full" radius="sm" opacity={0.35} />
        </Box>
      </ShimmerSurface>
    </ShimmerSurface>
  )
}

function RuntimeRecentLogsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ShimmerSurface
      className="project-runtime-recent-logs"
      mt={4}
      p={3}
      {...OBSERVE_SURFACE}
      aria-hidden
    >
      <ShimmerBlock w="140px" h="14px" radius="sm" mb={3} />
      <VStack align="stretch" gap={2}>
        {Array.from({ length: rows }).map((_, i) => (
          <HStack key={i} align="flex-start" gap={2} py={1}>
            <ShimmerBlock w="4.5rem" h="11px" radius="sm" flexShrink={0} />
            <ShimmerBlock w="44px" h="20px" radius="full" flexShrink={0} />
            <ShimmerBlock
              w="72px"
              h="20px"
              radius="full"
              flexShrink={0}
              display={{ base: 'none', sm: 'block' }}
            />
            <ShimmerBlock w={i % 2 === 0 ? '72%' : '58%'} h="11px" radius="sm" flex={1} />
          </HStack>
        ))}
      </VStack>
    </ShimmerSurface>
  )
}

export function ProjectRuntimePanelSkeleton({ label }: { label: string }) {
  return (
    <Box
      className="project-runtime-panel project-runtime-panel--skeleton"
      flex={1}
      minH={0}
      overflow="auto"
      aria-busy="true"
      aria-label={label}
    >
      <ProjectObservabilityHeaderSkeleton statCount={3} withActions />

      <Box className="project-observe-body" px={{ base: 3, md: 4 }} pb={{ base: 4, md: 5 }}>
        <RuntimeHostStateSkeleton />

        <Grid
          className="project-runtime-grid"
          templateColumns={{ base: '1fr', xl: '1fr 1fr' }}
          gap={{ base: 3, md: 4 }}
          mt={3}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <RuntimeMetricCardSkeleton key={index} index={index} />
          ))}
        </Grid>

        <RuntimeRecentLogsSkeleton />
        <ShimmerBlock w="240px" h="10px" radius="sm" mt={4} />
      </Box>
    </Box>
  )
}
