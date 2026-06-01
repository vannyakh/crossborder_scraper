import { Grid, HStack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import type { HardwareMonitor, RuntimeStatus } from '../../lib/api'
import { StatsGridSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function StatCell({
  label,
  value,
  hint,
  badge,
  href,
}: {
  label: string
  value: string
  hint?: string
  badge?: { status: 'success' | 'danger' | 'neutral' | 'running'; label: string }
  href?: string
}) {
  const inner = (
    <SectionCard p={3} _hover={href ? { borderColor: 'border.muted' } : undefined} transition="border-color 0.12s">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      {badge ? (
        <HStack mt={1} gap={1.5}>
          <StatusBadge status={badge.status} label={badge.label} />
        </HStack>
      ) : (
        <Text mt={1} fontSize="lg" fontWeight="semibold" color="fg">
          {value}
        </Text>
      )}
      {hint ? (
        <Text mt={0.5} fontSize="xs" color="fg.muted" lineClamp={1} title={hint}>
          {hint}
        </Text>
      ) : null}
    </SectionCard>
  )

  if (href) {
    return (
      <RouterLink to={href} style={{ display: 'block', textDecoration: 'none' }}>
        {inner}
      </RouterLink>
    )
  }
  return inner
}

export function LiveStatsBar({
  runtime,
  hardware,
  loading,
}: {
  runtime?: RuntimeStatus
  hardware?: HardwareMonitor
  loading?: boolean
}) {
  if (loading) {
    return <StatsGridSkeleton count={6} />
  }

  const uptime = runtime?.uptime_seconds
    ? `${Math.floor(runtime.uptime_seconds / 3600)}h ${Math.floor((runtime.uptime_seconds % 3600) / 60)}m`
    : '—'

  const llmEnabled = runtime?.ai?.ai_enabled
  const llmStatus = !llmEnabled ? 'neutral' : runtime?.ai?.llm_ready ? 'success' : 'danger'
  const llmLabel = !llmEnabled ? 'Disabled' : runtime?.ai?.llm_ready ? 'Ready' : 'Not ready'

  return (
    <Grid templateColumns={{ base: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }} gap={3}>
      <StatCell
        label="Engine slots"
        value={`${runtime?.active_tasks ?? 0} / ${runtime?.engine.max_concurrent_jobs ?? '—'}`}
        hint="Active scrape workers"
        href="/workflow/batches"
      />
      <StatCell
        label="Running batches"
        value={String(runtime?.running_batches.length ?? 0)}
        hint="Concurrent batch jobs"
        href="/workflow/batches"
      />
      <StatCell
        label="Products"
        value={String(runtime?.storage.products ?? '—')}
        hint="Catalog total"
        href="/artifact/products"
      />
      <StatCell
        label="Gateway LLM"
        value={llmLabel}
        badge={{ status: llmStatus, label: llmLabel }}
        hint={runtime?.ai?.ai_model ?? undefined}
        href="/settings/ai"
      />
      <StatCell
        label="CPU"
        value={hardware ? `${hardware.cpu.percent.toFixed(1)}%` : '—'}
        hint={hardware?.cpu.model_name ?? hardware?.cpu.architecture_summary}
      />
      <StatCell label="Service uptime" value={uptime} hint={runtime?.service} />
    </Grid>
  )
}
