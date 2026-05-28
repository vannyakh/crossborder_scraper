import { Box, Grid, HStack, Table, VStack, type GridProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Section, SectionCard } from './Section'
import { ShimmerBar, ShimmerBlock, ShimmerSurface, ShimmerWrap } from './Shimmer'

const CARD_SHELL = {
  p: 3,
  borderRadius: 'var(--radius-card)',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  bg: 'bg.elevated',
} as const

export type PanelSkeletonVariant =
  | 'table'
  | 'list-cards'
  | 'card-grid'
  | 'form'
  | 'section'
  | 'stats'
  | 'content'
  | 'checklist'
  | 'chat'
  | 'log-stream'
  | 'boot'
  | 'inline'
  | 'batch-jobs'
  | 'monitor-panels'
  | 'dialog'
  | 'tabs'

export type PanelSkeletonProps = {
  variant?: PanelSkeletonVariant
  /** table */
  columns?: number
  rows?: number
  maxH?: string
  /** list-cards, batch-jobs */
  count?: number
  /** form, section */
  fields?: number
  /** section */
  title?: string
  description?: string
  mt?: number
  /** stats, card-grid */
  templateColumns?: GridProps['templateColumns']
  /** content, log-stream */
  minH?: string
  /** inline */
  w?: string | number
  h?: string | number
  /** tabs */
  tabCount?: number
}

export function PanelShell({
  children,
  loading,
  skeleton,
}: {
  children: ReactNode
  loading: boolean
  skeleton: ReactNode
}) {
  return (
    <ShimmerWrap loading={loading} skeleton={skeleton}>
      {children}
    </ShimmerWrap>
  )
}

/** Unified entry — pick a layout variant used across the panel. */
export function PanelSkeleton({
  variant = 'form',
  columns = 4,
  rows = 8,
  maxH = 'min(70vh, 640px)',
  count = 5,
  fields = 4,
  title = '',
  description,
  mt = 0,
  templateColumns,
  minH,
  w = '72px',
  h = '14px',
  tabCount = 3,
}: PanelSkeletonProps) {
  switch (variant) {
    case 'table':
      return <DataTableSkeleton columns={columns} rows={rows} maxH={maxH} />
    case 'list-cards':
      return <ListCardRowsSkeleton rows={count} />
    case 'card-grid':
      return <CardGridSkeleton count={count} templateColumns={templateColumns} />
    case 'section':
      return (
        <SectionPanelSkeleton
          title={title || 'Loading'}
          description={description}
          mt={mt}
          fields={fields}
        />
      )
    case 'stats':
      return <StatsGridSkeleton count={count} templateColumns={templateColumns} />
    case 'content':
      return <ContentBlockSkeleton minH={minH} />
    case 'checklist':
      return <ChecklistGridSkeleton count={count} />
    case 'chat':
      return <ChatPanelSkeleton />
    case 'log-stream':
      return <LogStreamSkeleton minH={minH} />
    case 'boot':
      return <PageBootSkeleton />
    case 'inline':
      return <InlineShimmer w={w} h={h} />
    case 'batch-jobs':
      return <BatchJobsSkeleton rows={count} />
    case 'monitor-panels':
      return <MonitorPanelsSkeleton />
    case 'dialog':
      return <DialogContentSkeleton fields={fields} />
    case 'tabs':
      return <TabsBarSkeleton count={tabCount} />
    case 'form':
    default:
      return <FormFieldsSkeleton fields={fields} />
  }
}

export function SectionPanelSkeleton({
  title,
  description,
  mt = 0,
  fields = 4,
}: {
  title: string
  description?: string
  mt?: number
  fields?: number
}) {
  return (
    <Section title={title} description={description} mt={mt}>
      <SectionCard>
        <FormFieldsSkeleton fields={fields} />
      </SectionCard>
    </Section>
  )
}

export function FormFieldsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <VStack align="stretch" gap={4}>
      {Array.from({ length: fields }).map((_, i) => (
        <Box key={i}>
          <ShimmerBlock w={`${96 + (i % 3) * 24}px`} h="13px" mb={2} />
          <ShimmerBlock w="full" h="2.5rem" radius="var(--radius-input)" />
        </Box>
      ))}
    </VStack>
  )
}

export function StatusStripSkeleton({ items = 3 }: { items?: number }) {
  return (
    <ShimmerSurface
      mb={4}
      px={3}
      py={2.5}
      borderRadius="var(--radius-input)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.muted"
    >
      <HStack gap={2} flexWrap="wrap">
        {Array.from({ length: items }).map((_, i) => (
          <ShimmerBar key={i} w={`${72 + i * 16}px`} h="22px" radius="full" />
        ))}
      </HStack>
    </ShimmerSurface>
  )
}

export function StatsGridSkeleton({
  count = 4,
  templateColumns = { base: '1fr 1fr', md: 'repeat(4, 1fr)' },
}: {
  count?: number
  templateColumns?: GridProps['templateColumns']
}) {
  return (
    <Grid templateColumns={templateColumns} gap={3}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSurface key={i} {...CARD_SHELL} minH="auto">
          <ShimmerBlock w="64px" h="11px" radius="sm" />
          <ShimmerBlock w="44px" h="22px" radius="sm" mt={1.5} />
          <ShimmerBlock w="80px" h="10px" radius="sm" mt={1} />
        </ShimmerSurface>
      ))}
    </Grid>
  )
}

export function DataTableSkeleton({
  columns = 4,
  rows = 8,
  maxH = 'min(70vh, 640px)',
}: {
  columns?: number
  rows?: number
  maxH?: string
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      overflow="hidden"
      bg="bg.panel"
      maxH={maxH}
      overflowY="hidden"
      className="skeleton-shimmer"
    >
      <Table.Root size="sm" variant="line">
        <Table.Header bg="bg.panelHover">
          <Table.Row>
            {Array.from({ length: columns }).map((_, i) => (
              <Table.ColumnHeader key={i} py={3}>
                <ShimmerBlock w={`${56 + (i % 3) * 20}px`} h="12px" radius="sm" />
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Array.from({ length: rows }).map((_, ri) => (
            <Table.Row key={ri}>
              {Array.from({ length: columns }).map((_, ci) => (
                <Table.Cell key={ci} py={3.5}>
                  <ShimmerBlock
                    w={ci === 0 ? '78%' : `${45 + (ci % 2) * 15}%`}
                    h="12px"
                    radius="sm"
                  />
                  {ci === 0 ? <ShimmerBlock w="55%" h="10px" radius="sm" mt={1.5} /> : null}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

export function ListCardRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <VStack align="stretch" gap={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerSurface
          key={i}
          p={3}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.panel"
        >
          <HStack justify="space-between" mb={2}>
            <ShimmerBlock w={`${120 + (i % 2) * 40}px`} h="14px" />
            <ShimmerBlock w="56px" h="20px" radius="full" />
          </HStack>
          <ShimmerBlock w="40%" h="11px" radius="sm" />
        </ShimmerSurface>
      ))}
    </VStack>
  )
}

export function CardGridSkeleton({
  count = 6,
  templateColumns = { base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' },
}: {
  count?: number
  templateColumns?: GridProps['templateColumns']
}) {
  return (
    <Grid templateColumns={templateColumns} gap={3}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSurface
          key={i}
          {...CARD_SHELL}
          h="full"
          minH="140px"
          display="flex"
          flexDirection="column"
        >
          <HStack gap={2}>
            <ShimmerBlock w="30px" h="30px" radius="var(--radius-card)" />
            <ShimmerBlock w={`${84 + (i % 2) * 20}px`} h="14px" />
          </HStack>
          <VStack align="stretch" gap={1.5} mt={2} flex={1}>
            <ShimmerBlock w="full" h="11px" radius="sm" />
            <ShimmerBlock w="85%" h="11px" radius="sm" />
          </VStack>
          <ShimmerBlock w="72px" h="28px" radius="var(--radius-input)" mt={3} />
        </ShimmerSurface>
      ))}
    </Grid>
  )
}

export function ContentBlockSkeleton({ minH = 'min(280px, 40vh)' }: { minH?: string }) {
  return (
    <ShimmerSurface
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-input)"
      bg="bg.input"
      p={3}
      minH={minH}
    >
      <VStack align="stretch" gap={2}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerBlock key={i} w={i % 3 === 2 ? '70%' : 'full'} h="11px" radius="sm" />
        ))}
      </VStack>
    </ShimmerSurface>
  )
}

export function LogStreamSkeleton({ minH = '280px' }: { minH?: string }) {
  return (
    <ShimmerSurface
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-input)"
      bg="bg.subtle"
      p={3}
      minH={minH}
      maxH="50vh"
    >
      <VStack align="stretch" gap={1.5}>
        {Array.from({ length: 12 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            w={i % 4 === 0 ? '92%' : i % 4 === 1 ? '76%' : '64%'}
            h="10px"
            radius="sm"
          />
        ))}
      </VStack>
    </ShimmerSurface>
  )
}

export function BatchJobsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      overflow="hidden"
      bg="bg.panel"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <HStack
          key={i}
          px={4}
          py={2.5}
          borderBottomWidth={i < rows - 1 ? '1px' : 0}
          borderColor="border.subtle"
          gap={3}
        >
          <ShimmerBlock w="56px" h="20px" radius="full" flexShrink={0} />
          <Box flex={1}>
            <ShimmerBlock w="88%" h="12px" radius="sm" />
            <ShimmerBlock w="45%" h="10px" radius="sm" mt={1.5} />
          </Box>
          <ShimmerBlock w="40px" h="11px" radius="sm" flexShrink={0} />
        </HStack>
      ))}
    </Box>
  )
}

export function ChatPanelSkeleton() {
  return (
    <Box className="agent-chat" minH="min(480px, 62vh)">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box flex={1} minW="10rem">
          <ShimmerBlock w="72px" h="18px" mb={1.5} />
          <ShimmerBlock w="min(240px, 80%)" h="11px" radius="sm" />
        </Box>
        <HStack gap={2}>
          <ShimmerBlock w="96px" h="2rem" radius="var(--radius-input)" />
          <ShimmerBlock w="2rem" h="2rem" radius="var(--radius-input)" />
        </HStack>
      </HStack>
      <VStack align="stretch" gap={3} flex={1} mb={4}>
        <HStack justify="flex-start">
          <ShimmerBlock w="65%" h="52px" radius="var(--radius-card)" />
        </HStack>
        <HStack justify="flex-end">
          <ShimmerBlock w="48%" h="40px" radius="var(--radius-card)" />
        </HStack>
        <HStack justify="flex-start">
          <ShimmerBlock w="72%" h="64px" radius="var(--radius-card)" />
        </HStack>
      </VStack>
      <ShimmerBlock w="full" h="2.75rem" radius="var(--radius-input)" />
    </Box>
  )
}

export function MonitorPanelsSkeleton() {
  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} alignItems="start">
      <Box>
        <ShimmerBlock w="120px" h="14px" mb={3} />
        <ListCardRowsSkeleton rows={2} />
      </Box>
      <Box>
        <ShimmerBlock w="140px" h="14px" mb={3} />
        <LogStreamSkeleton minH="min(420px, 50vh)" />
      </Box>
    </Grid>
  )
}

export function DialogContentSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <VStack align="stretch" gap={4} py={2}>
      <ShimmerBlock w="80%" h="14px" />
      <FormFieldsSkeleton fields={fields} />
      <HStack justify="flex-end" gap={2} pt={2}>
        <ShimmerBlock w="72px" h="2rem" radius="var(--radius-input)" />
        <ShimmerBlock w="88px" h="2rem" radius="var(--radius-input)" />
      </HStack>
    </VStack>
  )
}

export function TabsBarSkeleton({ count = 3 }: { count?: number }) {
  return (
    <HStack gap={2} mb={3} flexWrap="wrap">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock key={i} w={`${64 + i * 12}px`} h="2rem" radius="var(--radius-input)" />
      ))}
    </HStack>
  )
}

export function InlineShimmer({
  w = '72px',
  h = '14px',
  radius = 'sm',
}: {
  w?: string | number
  h?: string | number
  radius?: string
}) {
  return <ShimmerBlock w={w} h={h} radius={radius} display="inline-block" verticalAlign="middle" />
}

export function PageBootSkeleton() {
  return (
    <VStack minH="100dvh" justify="center" gap={4} className="app-shell" px={4}>
      <ShimmerSurface
        w="full"
        maxW="420px"
        p={6}
        borderRadius="var(--radius-panel)"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.panel"
      >
        <ShimmerBlock w="160px" h="18px" mx="auto" mb={4} />
        <ShimmerBar h="2.5rem" radius="var(--radius-input)" mb={3} />
        <ShimmerBar h="2.5rem" radius="var(--radius-input)" />
      </ShimmerSurface>
    </VStack>
  )
}

export function ChecklistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={2}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSurface
          key={i}
          p={3}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.panel"
        >
          <HStack justify="space-between" mb={2}>
            <ShimmerBlock w={`${88 + (i % 3) * 16}px`} h="13px" />
            <ShimmerBlock w="40px" h="20px" radius="full" />
          </HStack>
          <ShimmerBlock w="full" h="11px" radius="sm" />
        </ShimmerSurface>
      ))}
    </Grid>
  )
}
