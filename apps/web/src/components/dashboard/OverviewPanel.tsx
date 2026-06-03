import { Box, Grid, HStack, Text } from '@chakra-ui/react'
import { Bot, Cpu, Database, Globe, Shield, type LucideIcon } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import type { HardwareMonitor, LLMHealth, RuntimeStatus, Stats } from '../../lib/api'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { countCookieSessions, formatUptime } from './dashboard-utils'
import { OverviewSkeleton } from './DashboardSkeleton'

type OverviewRow = {
  label: string
  value: string | number
  tone?: 'success' | 'danger' | 'neutral'
  href?: string
}

function OverviewColumn({
  icon: Icon,
  title,
  rows,
  accentPalette,
  href,
}: {
  icon: LucideIcon
  title: string
  rows: OverviewRow[]
  accentPalette: string
  href?: string
}) {
  const titleEl = (
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
  )

  return (
    <Box px={{ base: 3, md: 4 }} py={4}>
      {href ? (
        <RouterLink to={href} style={{ textDecoration: 'none' }}>
          <Box _hover={{ opacity: 0.8 }} transition="opacity 0.12s">
            {titleEl}
          </Box>
        </RouterLink>
      ) : (
        titleEl
      )}
      {rows.map((row) => {
        const valueEl =
          typeof row.value === 'string' && row.tone ? (
            <StatusBadge status={row.tone} label={row.value} />
          ) : (
            <Text fontWeight="medium" color="fg">
              {row.value}
            </Text>
          )

        return (
          <HStack key={row.label} justify="space-between" py={0.5} fontSize="xs">
            <Text color="fg.muted">{row.label}</Text>
            {row.href ? (
              <RouterLink to={row.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Box _hover={{ color: 'var(--app-accent)' }} transition="color 0.12s">
                  {valueEl}
                </Box>
              </RouterLink>
            ) : (
              valueEl
            )}
          </HStack>
        )
      })}
    </Box>
  )
}

export function OverviewPanel({
  runtime,
  stats,
  llm,
  hardware,
  gatewayTools,
  gatewayWorkflows: _gatewayWorkflows,
  scheduleCount,
  marketplaceConfigured,
  failedRunCount,
  loading,
}: {
  runtime?: RuntimeStatus
  stats?: Stats
  llm?: LLMHealth
  hardware?: HardwareMonitor
  gatewayTools: number
  gatewayWorkflows: number
  scheduleCount: number
  marketplaceConfigured: number
  failedRunCount?: number
  loading?: boolean
}) {
  const accentPalette = useAccentPalette()

  if (loading) return <OverviewSkeleton />
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

  const failedTone: 'danger' | 'success' | 'neutral' =
    (failedRunCount ?? 0) > 0 ? 'danger' : 'neutral'

  return (
    <Section title="Overview" description="Runtime snapshot across scrape, AI, and data">
      <SectionCard p={0}>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(5, 1fr)' }} gap={0}>
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Cpu}
            title="Host"
            href="/health"
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
            href="/workflow/batches"
            rows={[
              {
                label: 'Running',
                value: running,
                href: running > 0 ? '/workflow/batches' : undefined,
              },
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
            href="/agent/chat"
            rows={[
              { label: 'LLM', value: llmLabel, tone: llmTone, href: '/settings/ai' },
              { label: 'Model', value: runtime?.ai?.ai_model ?? '—', href: '/settings/ai' },
              { label: 'Tools', value: gatewayTools, href: '/agent/workflows' },
              { label: 'Schedules', value: scheduleCount, href: '/agent/schedules' },
              ...(failedRunCount !== undefined
                ? [
                    {
                      label: 'Failed runs',
                      value: failedRunCount > 0 ? String(failedRunCount) : '0',
                      tone: failedTone,
                      href: '/agent/runs',
                    } as OverviewRow,
                  ]
                : []),
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Database}
            title="Data store"
            href="/artifact/products"
            rows={[
              { label: 'Products', value: products, href: '/artifact/products' },
              { label: 'Batches', value: batches, href: '/workflow/batches' },
              { label: 'Output files', value: files },
            ]}
          />
          <OverviewColumn
            accentPalette={accentPalette}
            icon={Shield}
            title="Sessions & export"
            rows={[
              { label: 'Cookie sessions', value: sessions },
              {
                label: 'Marketplaces',
                value: marketplaceConfigured,
                href: '/settings/marketplaces',
              },
              { label: 'Agent schedules', value: scheduleCount, href: '/agent/schedules' },
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
