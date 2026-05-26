import { Box, Grid, HStack, Text } from '@chakra-ui/react'
import {
  Bot,
  Cpu,
  Database,
  Globe,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import type { HardwareMonitor, LLMHealth, RuntimeStatus, Stats } from '../../lib/api'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { countCookieSessions, formatUptime } from './dashboard-utils'

function OverviewColumn({
  icon: Icon,
  title,
  rows,
  accentPalette,
}: {
  icon: LucideIcon
  title: string
  rows: { label: string; value: string | number; tone?: 'success' | 'danger' | 'neutral' }[]
  accentPalette: string
}) {
  return (
    <Box px={{ base: 3, md: 4 }} py={4}>
      <HStack gap={2} mb={2}>
        <Box
          p={1.5}
          borderRadius="var(--radius-card)"
          colorPalette={accentPalette}
          bg="colorPalette.subtle"
          color="colorPalette.fg"
        >
          <Icon size={16} strokeWidth={2} />
        </Box>
        <Text fontSize="sm" fontWeight="semibold">
          {title}
        </Text>
      </HStack>
      {rows.map((row) => (
        <HStack key={row.label} justify="space-between" py={0.5} fontSize="xs">
          <Text color="fg.muted">{row.label}</Text>
          {typeof row.value === 'string' && row.tone ? (
            <StatusBadge status={row.tone} label={row.value} />
          ) : (
            <Text fontWeight="medium" color="fg">
              {row.value}
            </Text>
          )}
        </HStack>
      ))}
    </Box>
  )
}

export function OverviewPanel({
  runtime,
  stats,
  llm,
  hardware,
  gatewayTools,
  gatewayWorkflows,
  scheduleCount,
  marketplaceConfigured,
}: {
  runtime?: RuntimeStatus
  stats?: Stats
  llm?: LLMHealth
  hardware?: HardwareMonitor
  gatewayTools: number
  gatewayWorkflows: number
  scheduleCount: number
  marketplaceConfigured: number
}) {
  const accentPalette = useAccentPalette()
  const running = stats?.running_batches ?? runtime?.running_batches.length ?? 0
  const batches = stats?.batches ?? runtime?.storage.batches ?? 0
  const products = stats?.products ?? runtime?.storage.products ?? 0
  const files = stats?.output_files ?? runtime?.storage.output_files ?? 0
  const sessions = countCookieSessions(runtime?.cookies_sessions ?? stats?.cookies_sessions)

  const llmLabel = !runtime?.ai?.ai_enabled
    ? 'Disabled'
    : llm?.ok
      ? 'Healthy'
      : llm
        ? 'Unreachable'
        : 'Checking…'

  const llmTone: 'success' | 'danger' | 'neutral' = !runtime?.ai?.ai_enabled
    ? 'neutral'
    : llm?.ok
      ? 'success'
      : llm
        ? 'danger'
        : 'neutral'

  return (
    <Section title="Overview" description="Runtime snapshot across scrape, AI, and data">
      <SectionCard p={0}>
        <Grid
          templateColumns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(5, 1fr)' }}
          gap={0}
        >
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Cpu}
            title="Host"
            rows={[
              { label: 'CPU', value: hardware ? `${hardware.cpu.percent}%` : '—' },
              { label: 'Memory', value: hardware ? `${hardware.memory.percent}%` : '—' },
              { label: 'Disk', value: hardware ? `${hardware.disk.percent}%` : '—' },
              { label: 'Load', value: hardware ? `${hardware.load.percent}%` : '—' },
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Globe}
            title="Scrape engine"
            rows={[
              { label: 'Running', value: running },
              { label: 'Active tasks', value: runtime?.active_tasks ?? 0 },
              {
                label: 'Uptime',
                value: runtime ? formatUptime(runtime.uptime_seconds) : '—',
              },
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Bot}
            title="AI & gateway"
            rows={[
              { label: 'LLM', value: llmLabel, tone: llmTone },
              { label: 'Model', value: runtime?.ai?.ai_model ?? '—' },
              { label: 'Tools', value: gatewayTools },
              { label: 'Workflows', value: gatewayWorkflows },
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Database}
            title="Data store"
            rows={[
              { label: 'Products', value: products },
              { label: 'Batches', value: batches },
              { label: 'Output files', value: files },
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Shield}
            title="Sessions & export"
            rows={[
              { label: 'Cookie sessions', value: sessions },
              { label: 'Marketplaces', value: marketplaceConfigured },
              { label: 'Agent schedules', value: scheduleCount },
              {
                label: 'Proxies',
                value: runtime?.engine.proxy_count ?? 0,
              },
            ]}
          />
        </Grid>
      </SectionCard>
    </Section>
  )
}
