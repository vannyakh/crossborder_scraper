import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAgentRunsQuery } from '../../hooks'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { AgentToolTrace } from './AgentToolTrace'

function formatRunTime(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function AgentRunsPanel() {
  const { data, isLoading, error } = useAgentRunsQuery(50)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const runs = data?.items ?? []

  return (
    <Section
      title="Run history"
      description="Manual chat runs, cron schedules, and workflow-triggered agent executions"
      mt={0}
    >
      <SectionCard>
        {error ? (
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        ) : isLoading ? (
          <Text fontSize="sm" color="fg.muted">
            Loading runs…
          </Text>
        ) : runs.length === 0 ? (
          <Text fontSize="sm" color="fg.muted">
            No agent runs yet. Send a chat message or create a cron schedule.
          </Text>
        ) : (
          <VStack align="stretch" gap={2}>
            {runs.map((run) => {
              const expanded = expandedId === run.id
              const hasTools = (run.tool_calls?.length ?? 0) > 0
              return (
                <Box
                  key={run.id}
                  p={3}
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="var(--radius-card)"
                  bg="bg.panel"
                >
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
                    <Box flex={1} minW={0}>
                      <HStack gap={2} flexWrap="wrap">
                        <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                          {run.schedule_name ?? run.trigger ?? 'agent'}
                        </Text>
                        <StatusBadge
                          status={
                            run.ok ? 'success' : run.status === 'running' ? 'running' : 'danger'
                          }
                          label={run.status ?? 'unknown'}
                        />
                        {run.prompt_id ? (
                          <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                            {run.prompt_id}
                          </Text>
                        ) : null}
                      </HStack>
                      <Text mt={1} fontSize="xs" color="fg.muted" lineClamp={1} truncate>
                        {formatRunTime(run.started_at)}
                        {run.finished_at ? ` → ${formatRunTime(run.finished_at)}` : ''}
                      </Text>
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
                        }}
                        onClick={() => setExpandedId(expanded ? null : run.id)}
                      >
                        {expanded ? 'Hide tools' : `${run.tool_calls!.length} tools`}
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
