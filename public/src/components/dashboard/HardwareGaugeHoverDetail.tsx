import {
  Box,
  Collapsible,
  HStack,
  HoverCard,
  Link,
  Portal,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { HardwareMonitor } from '../../lib/api'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { EChart } from '../charts/EChart'
import { gaugeOption } from '../charts/chart-options'
import { useChartTheme } from '../../hooks/use-chart-theme'

function DetailSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger asChild>
        <button
          type="button"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.35rem 0',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          <Text fontSize="sm" fontWeight="semibold" color="fg">
            {title}
          </Text>
          <Collapsible.Indicator transition="transform 0.2s">
            <ChevronDown size={16} strokeWidth={2} />
          </Collapsible.Indicator>
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={1} pb={2}>
          {children}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <HStack justify="space-between" align="flex-start" gap={3} py={0.5} fontSize="xs">
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text color="fg" textAlign="right" wordBreak="break-word">
        {value}
      </Text>
    </HStack>
  )
}

function CoreGrid({ cores }: { cores: number[] }) {
  if (!cores.length) {
    return (
      <Text fontSize="xs" color="fg.muted">
        Per-core metrics unavailable
      </Text>
    )
  }
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(2, 1fr)"
      gap={2}
      fontSize="xs"
      color="fg"
    >
      {cores.map((pct, i) => (
        <HStack key={i} justify="space-between" gap={2}>
          <Text color="fg.muted">Core {i + 1}</Text>
          <Text fontWeight="medium">{pct}%</Text>
        </HStack>
      ))}
    </Box>
  )
}

function ProcessList({
  title,
  items,
  valueKey,
}: {
  title: string
  items: NonNullable<HardwareMonitor['top_cpu_processes']>
  valueKey: 'cpu_percent' | 'memory_percent'
}) {
  if (!items?.length) {
    return (
      <Text fontSize="xs" color="fg.muted" py={1}>
        No process data
      </Text>
    )
  }
  return (
    <VStack align="stretch" gap={1}>
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={0.5}>
        {title}
      </Text>
      {items.map((p) => (
        <HStack key={`${p.pid}-${p.name}`} justify="space-between" fontSize="xs">
          <Text color="fg" truncate maxW="70%">
            {p.name}
            <Text as="span" color="fg.muted">
              {' '}
              #{p.pid}
            </Text>
          </Text>
          <Text color="fg.muted" flexShrink={0}>
            {valueKey === 'cpu_percent'
              ? `${p.cpu_percent ?? 0}%`
              : `${p.memory_percent ?? 0}% · ${p.rss_human ?? '—'}`}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
}

function HoverDetailPanel({
  usageLabel,
  usagePercent,
  children,
  footer,
}: {
  usageLabel: string
  usagePercent: number
  children: ReactNode
  footer?: ReactNode
}) {
  const accentPalette = useAccentPalette()
  const [alarmOn, setAlarmOn] = useState(false)

  return (
    <Box
      w="320px"
      maxW="min(320px, 92vw)"
      bg="var(--flyout-bg)"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      boxShadow="var(--flyout-shadow)"
      p={3}
    >
      <Text fontSize="sm" color="fg">
        {usageLabel}:{' '}
        <Text as="span" fontWeight="bold" color={`${accentPalette}.500`}>
          {usagePercent}%
        </Text>
      </Text>

      <Box mt={2}>{children}</Box>

      <Separator my={3} borderColor="border.subtle" />

      <HStack justify="space-between" align="center">
        <HStack gap={2}>
          <Switch.Root
            size="sm"
            checked={alarmOn}
            onCheckedChange={(e) => setAlarmOn(!!e.checked)}
            colorPalette={accentPalette}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
          <Text fontSize="xs" color="fg.muted">
            Alarm
          </Text>
        </HStack>
        <Link asChild fontSize="xs" color={`${accentPalette}.500`} fontWeight="medium">
          <RouterLink to="/service/overview">Service</RouterLink>
        </Link>
      </HStack>

      {footer ? (
        <>
          <Separator my={3} borderColor="border.subtle" />
          {footer}
        </>
      ) : null}
    </Box>
  )
}

function TopProcessFooter({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <Box>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.65rem',
          borderRadius: 'var(--radius-input)',
          border: '1px solid var(--app-border)',
          background: 'var(--app-canvas)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          color: 'inherit',
        }}
      >
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
        {expanded ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </button>
      {expanded ? <Box mt={2}>{children}</Box> : null}
    </Box>
  )
}

export function CpuHoverDetail({ hardware }: { hardware: HardwareMonitor }) {
  const [showProcs, setShowProcs] = useState(false)
  const cpu = hardware.cpu

  return (
    <HoverDetailPanel usageLabel="CPU usage" usagePercent={cpu.percent}>
      <DetailSection title="CPU information">
        <InfoRow label="Model name" value={cpu.model_name || hardware.platform} />
        <InfoRow label="Architecture" value={cpu.architecture_summary ?? '—'} />
        <InfoRow label="Host" value={hardware.hostname} />
      </DetailSection>
      <DetailSection title="More load information">
        <CoreGrid cores={cpu.per_core_percent ?? []} />
        <Box mt={2}>
          <InfoRow label="Load (1/5/15)" value={`${hardware.load.load_1} / ${hardware.load.load_5} / ${hardware.load.load_15}`} />
        </Box>
      </DetailSection>
      <TopProcessFooter
        label="Process information of CPU TOP5"
        expanded={showProcs}
        onToggle={() => setShowProcs((v) => !v)}
      >
        <ProcessList title="Top CPU" items={hardware.top_cpu_processes ?? []} valueKey="cpu_percent" />
      </TopProcessFooter>
    </HoverDetailPanel>
  )
}

export function MemoryHoverDetail({ hardware }: { hardware: HardwareMonitor }) {
  const [showProcs, setShowProcs] = useState(false)
  const mem = hardware.memory

  return (
    <HoverDetailPanel usageLabel="Memory usage" usagePercent={mem.percent}>
      <DetailSection title="Memory information">
        <InfoRow label="Used" value={`${mem.used_human} / ${mem.total_human}`} />
        <InfoRow label="Available" value={mem.available_human || '—'} />
        {mem.swap_percent != null ? (
          <InfoRow
            label="Swap"
            value={`${mem.swap_used_human ?? '—'} / ${mem.swap_total_human ?? '—'} (${mem.swap_percent}%)`}
          />
        ) : null}
      </DetailSection>
      <DetailSection title="Service process" defaultOpen={false}>
        <InfoRow label="RSS" value={hardware.process.rss_human} />
        <InfoRow label="Threads" value={hardware.process.threads} />
      </DetailSection>
      <TopProcessFooter
        label="Process information of Memory TOP5"
        expanded={showProcs}
        onToggle={() => setShowProcs((v) => !v)}
      >
        <ProcessList
          title="Top memory"
          items={hardware.top_memory_processes ?? []}
          valueKey="memory_percent"
        />
      </TopProcessFooter>
    </HoverDetailPanel>
  )
}

export function DiskHoverDetail({ hardware }: { hardware: HardwareMonitor }) {
  const disk = hardware.disk

  return (
    <HoverDetailPanel usageLabel="Disk usage" usagePercent={disk.percent}>
      <DetailSection title="Disk information">
        <InfoRow label="Mount path" value={disk.path} />
        <InfoRow label="Used" value={`${disk.used_human} / ${disk.total_human}`} />
        <InfoRow label="Free" value={disk.free_human || '—'} />
      </DetailSection>
      <DetailSection title="Platform" defaultOpen={false}>
        <InfoRow label="OS" value={hardware.platform} />
        <InfoRow label="Python" value={hardware.python_version} />
      </DetailSection>
    </HoverDetailPanel>
  )
}

export function LoadHoverDetail({ hardware }: { hardware: HardwareMonitor }) {
  const load = hardware.load

  return (
    <HoverDetailPanel usageLabel="Load average" usagePercent={load.percent}>
      <DetailSection title="Load information">
        <InfoRow label="1 min" value={load.load_1} />
        <InfoRow label="5 min" value={load.load_5} />
        <InfoRow label="15 min" value={load.load_15} />
        <InfoRow label="Normalized" value={`${load.percent}%`} />
      </DetailSection>
      <DetailSection title="Per-core usage">
        <CoreGrid cores={hardware.cpu.per_core_percent ?? []} />
      </DetailSection>
    </HoverDetailPanel>
  )
}

export function HardwareGaugeHoverCard({
  label,
  detail,
  percent,
  color,
  detailContent,
}: {
  label: string
  detail: string
  percent: number
  color?: string
  detailContent: ReactNode
}) {
  const theme = useChartTheme()

  return (
    <HoverCard.Root openDelay={200} closeDelay={120} positioning={{ placement: 'bottom' }}>
      <HoverCard.Trigger asChild>
        <Box
          p={3}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.elevated"
          minH="120px"
          cursor="default"
          transition="border-color var(--motion-duration), box-shadow var(--motion-duration)"
          _hover={{
            borderColor: 'border.emphasized',
            boxShadow: 'sm',
          }}
        >
          <Text fontSize="sm" fontWeight="semibold" color="fg">
            {label}
          </Text>
          <Text mt={0.5} fontSize="xs" color="fg.muted" lineClamp={1} truncate title={detail}>
            {detail}
          </Text>
          <EChart option={gaugeOption(theme, { value: percent, color })} height={88} />
        </Box>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner zIndex={60}>
          <HoverCard.Content p={0} bg="transparent" border="none" shadow="none">
            {detailContent}
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  )
}
