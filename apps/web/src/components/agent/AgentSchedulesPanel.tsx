import { Box, Button, HStack, IconButton, Input, Table, Text } from '@chakra-ui/react'
import { Play, Plus, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataList, DataListEmpty } from '../ui/DataList'
import { DataTableSkeleton } from '../ui/PanelSkeleton'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import {
  useAgentSchedulesQuery,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useGatewayPromptsQuery,
  useRunScheduleNowMutation,
  useUpdateScheduleMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { AgentSchedule } from '../../lib/api'
import { AgentScheduleDeleteDialog } from './AgentScheduleDeleteDialog'
import { AgentScheduleLogDialog } from './AgentScheduleLogDialog'
import { AgentScheduleTaskDrawer, type ScheduleTaskFormValues } from './AgentScheduleTaskDrawer'
import { describeCronExpression, formatScheduleTime } from './schedule-cron-utils'

type StatusFilter = 'all' | 'enabled' | 'disabled'

function scheduleStatusTone(s: AgentSchedule): 'running' | 'success' | 'danger' | 'neutral' {
  if (!s.enabled) return 'neutral'
  if (s.last_status === 'success') return 'success'
  if (s.last_status === 'failed') return 'danger'
  return 'running'
}

function scheduleStatusLabel(s: AgentSchedule): string {
  if (!s.enabled) return 'Paused'
  if (s.last_status === 'success') return 'OK'
  if (s.last_status === 'failed') return 'Failed'
  return 'Ready'
}

export function AgentSchedulesPanel() {
  const accentPalette = useAccentPalette()
  const schedulesQuery = useAgentSchedulesQuery()
  const promptsQuery = useGatewayPromptsQuery()
  const createMutation = useCreateScheduleMutation()
  const updateMutation = useUpdateScheduleMutation()
  const deleteMutation = useDeleteScheduleMutation()
  const runNowMutation = useRunScheduleNowMutation()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<AgentSchedule | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [logSchedule, setLogSchedule] = useState<AgentSchedule | null>(null)
  const [deleteSchedule, setDeleteSchedule] = useState<AgentSchedule | null>(null)

  const schedules = schedulesQuery.data?.items ?? []
  const prompts = promptsQuery.data?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schedules.filter((s) => {
      if (statusFilter === 'enabled' && !s.enabled) return false
      if (statusFilter === 'disabled' && s.enabled) return false
      if (!q) return true
      return [s.name, s.cron, s.prompt_id, s.message, s.id].join(' ').toLowerCase().includes(q)
    })
  }, [schedules, search, statusFilter])

  function openAdd() {
    setDrawerMode('add')
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(s: AgentSchedule) {
    setDrawerMode('edit')
    setEditing(s)
    setDrawerOpen(true)
  }

  function openLog(s: AgentSchedule) {
    setLogSchedule(s)
  }

  function openDelete(s: AgentSchedule) {
    setDeleteSchedule(s)
  }

  async function handleSubmit(values: ScheduleTaskFormValues) {
    if (drawerMode === 'add') {
      await createMutation.mutateAsync({
        name: values.name,
        cron: values.cron,
        prompt_id: values.prompt_id,
        message: values.message,
        enabled: values.enabled,
      })
    } else if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        name: values.name,
        cron: values.cron,
        prompt_id: values.prompt_id,
        message: values.message,
        enabled: values.enabled,
      })
    }
    setDrawerOpen(false)
  }

  async function handleExecute(id: string) {
    setRunningId(id)
    try {
      await runNowMutation.mutateAsync(id)
      await schedulesQuery.refetch()
    } finally {
      setRunningId(null)
    }
  }

  async function handleExecuteFromLog() {
    if (!logSchedule) return
    const id = logSchedule.id
    setRunningId(id)
    try {
      const result = await runNowMutation.mutateAsync(id)
      const refreshed = await schedulesQuery.refetch()
      const updated = refreshed.data?.items.find((s) => s.id === id)
      if (updated) setLogSchedule(updated)
      return result
    } finally {
      setRunningId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteSchedule) return
    await deleteMutation.mutateAsync(deleteSchedule.id)
    setDeleteSchedule(null)
    if (logSchedule?.id === deleteSchedule.id) setLogSchedule(null)
  }

  return (
    <Section
      title="Cron job"
      description="Server-side agent schedules — add tasks, set execute cycle, run on demand"
      mt={0}
    >
      <HStack justify="space-between" flexWrap="wrap" gap={3} mb={4}>
        <Button size="sm" colorPalette="green" borderRadius="input" onClick={openAdd}>
          <Plus size={14} />
          Add task
        </Button>

        <HStack
          gap={2}
          flex="1"
          justify="flex-end"
          flexWrap="wrap"
          minW={{ base: 'full', md: 'auto' }}
        >
          <HStack
            flex="1"
            minW={{ base: 'full', sm: '220px' }}
            maxW="md"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            px={2}
            bg="bg.input"
          >
            <Search size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
            <Input
              size="sm"
              variant="flushed"
              border="none"
              placeholder="Task name or fuzzy search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </HStack>

          <HStack gap={1}>
            {(['all', 'enabled', 'disabled'] as const).map((f) => (
              <Button
                key={f}
                size="xs"
                variant={statusFilter === f ? 'solid' : 'outline'}
                colorPalette={statusFilter === f ? accentPalette : 'gray'}
                borderColor="border.subtle"
                borderRadius="input"
                onClick={() => setStatusFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'enabled' ? 'Running' : 'Paused'}
              </Button>
            ))}
          </HStack>

          <IconButton
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            aria-label="Refresh schedules"
            loading={schedulesQuery.isFetching}
            onClick={() => void schedulesQuery.refetch()}
          >
            <RefreshCw size={14} />
          </IconButton>
        </HStack>
      </HStack>

      {schedulesQuery.error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((schedulesQuery.error as Error).message || schedulesQuery.error)}
        </Text>
      ) : null}

      {schedulesQuery.isLoading ? (
        <DataTableSkeleton columns={5} rows={8} />
      ) : filtered.length === 0 ? (
        <DataListEmpty>
          {schedules.length === 0
            ? 'No cron tasks — click Add task to register a server schedule.'
            : 'No tasks match your search.'}
        </DataListEmpty>
      ) : (
        <DataList>
          <Table.Header bg="bg.panelHover" position="sticky" top={0} zIndex={1}>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader w="100px">Status</Table.ColumnHeader>
              <Table.ColumnHeader>Execute cycle</Table.ColumnHeader>
              <Table.ColumnHeader w="180px">Last execute time</Table.ColumnHeader>
              <Table.ColumnHeader w="220px" textAlign="right">
                Operate
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.map((s) => (
              <Table.Row key={s.id} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell maxW="240px">
                  <Text fontSize="sm" fontWeight="medium" lineClamp={1} title={s.name}>
                    {s.name}
                  </Text>
                  <Text fontSize="xs" color="fg.subtle" fontFamily="mono" lineClamp={1}>
                    {s.prompt_id}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    {s.enabled ? <Play size={12} color="var(--chakra-colors-green-500)" /> : null}
                    <StatusBadge status={scheduleStatusTone(s)} label={scheduleStatusLabel(s)} />
                  </HStack>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted" maxW="280px">
                  <Text lineClamp={1} title={s.cron}>
                    {describeCronExpression(s.cron)}
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color="fg.subtle" lineClamp={1}>
                    {s.cron}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                  {formatScheduleTime(s.last_run_at)}
                  {s.next_run_at && s.enabled ? (
                    <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                      Next: {formatScheduleTime(s.next_run_at)}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end" flexWrap="wrap">
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="green"
                      loading={runningId === s.id && runNowMutation.isPending}
                      onClick={() => void handleExecute(s.id)}
                    >
                      Execute
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="blue"
                      onClick={() => openLog(s)}
                    >
                      Log
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => openDelete(s)}
                    >
                      Delete
                    </Button>
                  </HStack>
                  {s.last_error ? (
                    <Text fontSize="xs" color="red.500" mt={1} lineClamp={2} textAlign="right">
                      {s.last_error}
                    </Text>
                  ) : null}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </DataList>
      )}

      <Box mt={3}>
        <Text fontSize="xs" color="fg.subtle">
          {filtered.length} of {schedules.length} task(s) · scheduler checks every minute on the
          server
        </Text>
      </Box>

      <AgentScheduleTaskDrawer
        open={drawerOpen}
        mode={drawerMode}
        schedule={editing}
        prompts={prompts}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <AgentScheduleLogDialog
        open={Boolean(logSchedule)}
        schedule={logSchedule}
        executing={Boolean(logSchedule && runningId === logSchedule.id && runNowMutation.isPending)}
        onClose={() => setLogSchedule(null)}
        onExecute={handleExecuteFromLog}
      />

      <AgentScheduleDeleteDialog
        open={Boolean(deleteSchedule)}
        schedule={deleteSchedule}
        deleting={deleteMutation.isPending}
        onClose={() => setDeleteSchedule(null)}
        onConfirm={handleConfirmDelete}
      />
    </Section>
  )
}
