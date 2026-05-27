import { Grid, Text } from '@chakra-ui/react'
import type { HardwareMonitor, RuntimeStatus } from '../../lib/api'
import { SectionCard } from '../ui/Section'

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <SectionCard p={3}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text mt={1} fontSize="lg" fontWeight="semibold" color="fg">
        {value}
      </Text>
      {hint ? (
        <Text mt={0.5} fontSize="xs" color="fg.muted" lineClamp={1} title={hint}>
          {hint}
        </Text>
      ) : null}
    </SectionCard>
  )
}

export function LiveStatsBar({
  runtime,
  hardware,
}: {
  runtime?: RuntimeStatus
  hardware?: HardwareMonitor
}) {
  const uptime = runtime?.uptime_seconds
    ? `${Math.floor(runtime.uptime_seconds / 3600)}h ${Math.floor((runtime.uptime_seconds % 3600) / 60)}m`
    : '—'

  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={3}>
      <StatCell
        label="Engine slots"
        value={`${runtime?.active_tasks ?? 0} / ${runtime?.engine.max_concurrent_jobs ?? '—'}`}
        hint="Active scrape workers"
      />
      <StatCell
        label="Running batches"
        value={String(runtime?.running_batches.length ?? 0)}
        hint="Concurrent batch jobs"
      />
      <StatCell
        label="CPU"
        value={hardware ? `${hardware.cpu.percent.toFixed(1)}%` : '—'}
        hint={hardware?.cpu.model}
      />
      <StatCell label="Service uptime" value={uptime} hint={runtime?.service} />
    </Grid>
  )
}
