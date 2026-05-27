import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AgentModalPanel } from './AgentModalPanel'
import { LogStreamSkeleton } from '../ui/PanelSkeleton'
import { useAgentRunsQuery, useLogsQuery } from '../../hooks'
import type { AgentSchedule, GatewayAgentResponse } from '../../lib/api'
import { formatScheduleTime } from './schedule-cron-utils'

function formatLogTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}

function buildLogText(
  schedule: AgentSchedule,
  cronLogs: { created_at: string; operation_type: string; details: string }[],
  runs: {
    schedule_id?: string | null
    started_at?: string | null
    finished_at?: string | null
    ok?: boolean | null
    status?: string | null
    response?: string | null
    error?: string | null
    trigger?: string | null
  }[],
  executeNote?: string | null,
): string {
  const lines: string[] = []
  const relatedRuns = runs.filter((r) => r.schedule_id === schedule.id)

  if (executeNote) {
    lines.push(`[${formatLogTimestamp(new Date().toISOString())}] ${executeNote}`)
    lines.push('')
  }

  if (schedule.last_error) {
    lines.push(`[${formatLogTimestamp(schedule.last_run_at ?? new Date().toISOString())}] Failed`)
    lines.push(schedule.last_error)
    lines.push('')
  }

  for (const run of relatedRuns) {
    const ts = run.finished_at ?? run.started_at ?? ''
    const label = run.ok ? 'Successful' : run.status === 'running' ? 'Running' : 'Failed'
    lines.push(`[${formatLogTimestamp(ts)}] ${label} (${run.trigger ?? 'cron'})`)
    if (run.response) lines.push(run.response)
    if (run.error) lines.push(run.error)
    lines.push('')
  }

  for (const entry of cronLogs) {
    lines.push(`[${formatLogTimestamp(entry.created_at)}] ${entry.operation_type}`)
    lines.push(entry.details)
    lines.push('')
  }

  if (lines.length === 0) {
    return 'No log entries for this task yet. Click Execute to run the agent now.'
  }

  return lines.join('\n').trimEnd()
}

type AgentScheduleLogDialogProps = {
  open: boolean
  schedule: AgentSchedule | null
  executing: boolean
  onClose: () => void
  onExecute: () => Promise<GatewayAgentResponse | void>
}

export function AgentScheduleLogDialog({
  open,
  schedule,
  executing,
  onClose,
  onExecute,
}: AgentScheduleLogDialogProps) {
  const [executeNote, setExecuteNote] = useState<string | null>(null)
  const searchQ = schedule?.name ?? ''

  const logsQuery = useLogsQuery({
    category: 'cron',
    q: searchQ,
    limit: 100,
    offset: 0,
    enabled: open && Boolean(schedule),
  })
  const runsQuery = useAgentRunsQuery(80, open && Boolean(schedule))

  useEffect(() => {
    if (open) setExecuteNote(null)
  }, [open, schedule?.id])

  const logText = useMemo(() => {
    if (!schedule) return ''
    return buildLogText(
      schedule,
      logsQuery.data?.items ?? [],
      runsQuery.data?.items ?? [],
      executeNote,
    )
  }, [schedule, logsQuery.data?.items, runsQuery.data?.items, executeNote])

  async function refreshLogs() {
    await Promise.all([logsQuery.refetch(), runsQuery.refetch()])
  }

  async function handleExecute() {
    const result = await onExecute()
    if (result) {
      const status = result.ok ? 'Successful' : 'Failed'
      const msg = result.message?.slice(0, 500) ?? ''
      setExecuteNote(`Execute — ${status}${msg ? `\n${msg}` : ''}`)
    }
    await refreshLogs()
  }

  return (
    <AgentModalPanel
      open={open}
      onClose={onClose}
      title={schedule ? `View [${schedule.name}] log` : 'Task log'}
      maxW="800px"
    >
      <HStack gap={2} mb={3} flexWrap="wrap">
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          loading={logsQuery.isFetching || runsQuery.isFetching}
          onClick={() => void refreshLogs()}
        >
          <RefreshCw size={14} />
          Refresh log
        </Button>
        <Button
          size="sm"
          colorPalette="green"
          borderRadius="input"
          loading={executing}
          disabled={!schedule}
          onClick={() => void handleExecute()}
        >
          Execute
        </Button>
      </HStack>

      {schedule ? (
        <Text fontSize="xs" color="fg.muted" mb={2}>
          Last run: {formatScheduleTime(schedule.last_run_at)} · Next:{' '}
          {formatScheduleTime(schedule.next_run_at)}
        </Text>
      ) : null}

      <Box
        p={3}
        minH="280px"
        maxH="50vh"
        overflow="auto"
        className="app-scroll"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        bg="bg.subtle"
        fontFamily="mono"
        fontSize="xs"
        lineHeight="tall"
        whiteSpace="pre-wrap"
        color="fg.muted"
      >
        {logsQuery.isLoading && !logText ? <LogStreamSkeleton minH="280px" /> : logText}
      </Box>
    </AgentModalPanel>
  )
}
