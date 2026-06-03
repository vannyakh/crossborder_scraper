import { Box, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAgentRunsQuery } from '../../hooks'
import { formatDurationMs, formatIsoDateTime } from '../../lib/datetime'
import { Section, SectionCard } from '../ui/Section'
import { ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import { AgentToolTrace } from './AgentToolTrace'

function triggerLabel(run: { trigger?: string | null; schedule_name?: string | null }): string {
  if (run.schedule_name) return run.schedule_name
  if (run.trigger === 'schedule') return 'Schedule'
  if (run.trigger === 'workflow') return 'Workflow'
  if (run.trigger === 'telegram') return 'Telegram'
  return run.trigger ?? 'Manual'
}

function triggerKind(trigger?: string | null): string {
  if (!trigger || trigger === 'manual') return 'manual'
  if (trigger === 'schedule') return 'schedule'
  if (trigger === 'workflow') return 'workflow'
  return 'other'
}

export function AgentRunsPanel() {
  const { data, isLoading, error } = useAgentRunsQuery(80)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'manual' | 'schedule' | 'workflow'>(
    'all',
  )
  const allRuns = data?.items ?? []

  const runs = allRuns.filter((run) => {
    if (statusFilter === 'success' && !run.ok) return false
    if (statusFilter === 'failed' && run.ok !== false) return false
    if (triggerFilter !== 'all' && triggerKind(run.trigger) !== triggerFilter) return false
    return true
  })

  const failedCount = allRuns.filter((r) => r.ok === false).length

  return (
    <Section
      title="Run history"
      description="Manual chat runs, cron schedules, and workflow-triggered agent executions"
      mt={0}
    >
      <SectionCard>
        {/* Filter bar */}
        <HStack gap={2} mb={3} flexWrap="wrap">
          <HStack gap={1} align="center">
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
              Status
            </Text>
            <NativeSelect.Root size="sm" minW="7rem">
              <NativeSelect.Field
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
              >
                <option value="all">All ({allRuns.length})</option>
                <option value="success">Success</option>
                <option value="failed">Failed {failedCount > 0 ? `(${failedCount})` : ''}</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack gap={1} align="center">
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
              Trigger
            </Text>
            <NativeSelect.Root size="sm" minW="8rem">
              <NativeSelect.Field
                value={triggerFilter}
                onChange={(e) =>
                  setTriggerFilter(e.target.value as 'all' | 'manual' | 'schedule' | 'workflow')
                }
              >
                <option value="all">All</option>
                <option value="manual">Manual</option>
                <option value="schedule">Schedule</option>
                <option value="workflow">Workflow</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          {runs.length !== allRuns.length ? (
            <Text fontSize="xs" color="fg.muted">
              Showing {runs.length} of {allRuns.length}
            </Text>
          ) : null}
        </HStack>

        {error ? (
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        ) : isLoading ? (
          <ListCardRowsSkeleton rows={6} />
        ) : runs.length === 0 ? (
          <Text fontSize="sm" color="fg.muted">
            {allRuns.length === 0
              ? 'No agent runs yet. Send a chat message or create a cron schedule.'
              : 'No runs match the current filter.'}
          </Text>
        ) : (
          <VStack align="stretch" gap={2}>
            {runs.map((run) => {
              const expanded = expandedId === run.id
              const hasTools = (run.tool_calls?.length ?? 0) > 0
              const duration = formatDurationMs(run.started_at, run.finished_at)
              return (
                <Box
                  key={run.id}
                  p={3}
                  borderWidth="1px"
                  borderColor={run.ok === false ? 'red.subtle' : 'border.subtle'}
                  borderRadius="var(--radius-card)"
                  bg="bg.panel"
                  _hover={{ borderColor: 'border.muted' }}
                  transition="border-color 0.12s"
                >
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
                    <Box flex={1} minW={0}>
                      <HStack gap={2} flexWrap="wrap">
                        <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                          {triggerLabel(run)}
                        </Text>
                        <StatusBadge
                          status={
                            run.ok ? 'success' : run.status === 'running' ? 'running' : 'danger'
                          }
                          label={run.status ?? 'unknown'}
                        />
                        {run.trigger && run.trigger !== 'manual' ? (
                          <StatusBadge status="neutral" label={run.trigger} />
                        ) : null}
                        {run.prompt_id ? (
                          <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                            {run.prompt_id}
                          </Text>
                        ) : null}
                      </HStack>
                      <HStack mt={0.5} gap={2} flexWrap="wrap">
                        <Text fontSize="xs" color="fg.muted">
                          {formatIsoDateTime(run.started_at)}
                        </Text>
                        {duration ? (
                          <Text fontSize="xs" color="fg.subtle">
                            · {duration}
                          </Text>
                        ) : null}
                      </HStack>
                    </Box>
                    {hasTools ? (
                      <button
                        type="button"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--app-accent)',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          flexShrink: 0,
                        }}
                        onClick={() => setExpandedId(expanded ? null : run.id)}
                      >
                        {expanded ? 'Hide tools' : `${run.tool_calls!.length} tools ▾`}
                      </button>
                    ) : null}
                  </HStack>
                  <Text mt={2} fontSize="sm" color="fg.muted" lineClamp={expanded ? undefined : 2}>
                    {run.response ?? run.error ?? run.message ?? '—'}
                  </Text>
                  {expanded && hasTools ? (
                    <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
                      <AgentToolTrace toolCalls={run.tool_calls ?? []} />
                    </Box>
                  ) : null}
                </Box>
              )
            })}
          </VStack>
        )}
        <Text mt={4} fontSize="xs" color="fg.muted">
          Check logs for scrape failures, verify health on the{' '}
          <RouterLink to="/health" style={{ color: 'var(--app-accent)' }}>
            Health
          </RouterLink>{' '}
          page, and review proxy settings if sites block requests.
        </Text>
      </SectionCard>
    </Section>
  )
}
