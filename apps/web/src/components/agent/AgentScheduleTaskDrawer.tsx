import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Field,
  HStack,
  Input,
  NativeSelect,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import type { AgentSchedule } from '../../lib/api'
import type { GatewayPrompt } from '../../lib/api'
import {
  buildCronFromCycle,
  defaultCronCycleState,
  describeCronCycle,
  parseCronToCycle,
  type CronCycle,
  type CronCycleState,
} from './schedule-cron-utils'

const CYCLE_OPTIONS: { value: CronCycle; label: string }[] = [
  { value: 'minute', label: 'N minutes' },
  { value: 'hourly', label: 'N hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom cron' },
]

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export type ScheduleTaskFormValues = {
  name: string
  cron: string
  prompt_id: string
  message: string
  enabled: boolean
}

type AgentScheduleTaskDrawerProps = {
  open: boolean
  mode: 'add' | 'edit'
  schedule?: AgentSchedule | null
  prompts: GatewayPrompt[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: ScheduleTaskFormValues) => Promise<void>
}

export function AgentScheduleTaskDrawer({
  open,
  mode,
  schedule,
  prompts,
  saving,
  onClose,
  onSubmit,
}: AgentScheduleTaskDrawerProps) {
  const [name, setName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [promptId, setPromptId] = useState('gateway_agent')
  const [message, setMessage] = useState('')
  const [cycleState, setCycleState] = useState<CronCycleState>(defaultCronCycleState)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && schedule) {
      setName(schedule.name)
      setEnabled(schedule.enabled)
      setPromptId(schedule.prompt_id)
      setMessage(schedule.message)
      setCycleState(parseCronToCycle(schedule.cron))
      return
    }
    setName('')
    setEnabled(true)
    setPromptId(prompts[0]?.id ?? 'gateway_agent')
    setMessage('Run catalog and marketplace health snapshot. Report actions needed.')
    setCycleState(defaultCronCycleState())
  }, [open, mode, schedule, prompts])

  const cron = useMemo(() => buildCronFromCycle(cycleState), [cycleState])
  const cycleSummary = useMemo(() => describeCronCycle(cycleState), [cycleState])

  function patchCycle(patch: Partial<CronCycleState>) {
    setCycleState((s) => ({ ...s, ...patch }))
  }

  async function handleConfirm() {
    if (!name.trim() || !message.trim()) return
    await onSubmit({
      name: name.trim(),
      cron,
      prompt_id: promptId,
      message: message.trim(),
      enabled,
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={(e) => !e.open && onClose()} placement="end" size="md">
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content maxW="520px" bg="bg.panel" borderRadius="var(--radius-panel)">
          <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={3}>
            <Drawer.Title fontSize="md" fontWeight="semibold">
              {mode === 'add' ? 'Add task' : 'Edit task'}
            </Drawer.Title>
            <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
              <Button size="sm" variant="ghost">
                ✕
              </Button>
            </Drawer.CloseTrigger>
          </Drawer.Header>

          <Drawer.Body py={4} className="app-scroll">
            <VStack align="stretch" gap={4}>
              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
                  Task type
                </Field.Label>
                <Input {...fieldStyles} value="Agent prompt (server cron)" readOnly />
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
                  Task name
                </Field.Label>
                <Input
                  {...fieldStyles}
                  placeholder="Please enter task name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field.Root>

              <Box>
                <Text fontSize="xs" color="fg.muted" mb={2}>
                  Execute cycle
                </Text>
                <HStack gap={2} flexWrap="wrap" align="flex-end">
                  <NativeSelect.Root {...fieldStyles} size="sm" minW="140px">
                    <NativeSelect.Field
                      value={cycleState.cycle}
                      onChange={(e) => patchCycle({ cycle: e.target.value as CronCycle })}
                    >
                      {CYCLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>

                  {cycleState.cycle === 'minute' ? (
                    <Field.Root maxW="100px">
                      <Field.Label fontSize="2xs" color="fg.subtle">
                        Minutes
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        type="number"
                        min={1}
                        max={59}
                        value={cycleState.intervalMinutes}
                        onChange={(e) => patchCycle({ intervalMinutes: Number(e.target.value) })}
                      />
                    </Field.Root>
                  ) : null}

                  {cycleState.cycle === 'hourly' ? (
                    <>
                      <Field.Root maxW="100px">
                        <Field.Label fontSize="2xs" color="fg.subtle">
                          Every (hours)
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          min={1}
                          max={23}
                          value={cycleState.intervalHours}
                          onChange={(e) => patchCycle({ intervalHours: Number(e.target.value) })}
                        />
                      </Field.Root>
                      <Field.Root maxW="80px">
                        <Field.Label fontSize="2xs" color="fg.subtle">
                          At min
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          min={0}
                          max={59}
                          value={cycleState.minute}
                          onChange={(e) => patchCycle({ minute: Number(e.target.value) })}
                        />
                      </Field.Root>
                    </>
                  ) : null}

                  {cycleState.cycle === 'weekly' ? (
                    <NativeSelect.Root {...fieldStyles} size="sm" minW="120px">
                      <NativeSelect.Field
                        value={String(cycleState.dayOfWeek)}
                        onChange={(e) => patchCycle({ dayOfWeek: Number(e.target.value) })}
                      >
                        {WEEKDAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  ) : null}

                  {cycleState.cycle === 'monthly' ? (
                    <Field.Root maxW="80px">
                      <Field.Label fontSize="2xs" color="fg.subtle">
                        Day
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        type="number"
                        min={1}
                        max={28}
                        value={cycleState.dayOfMonth}
                        onChange={(e) => patchCycle({ dayOfMonth: Number(e.target.value) })}
                      />
                    </Field.Root>
                  ) : null}

                  {['daily', 'weekly', 'monthly'].includes(cycleState.cycle) ? (
                    <>
                      <Field.Root maxW="80px">
                        <Field.Label fontSize="2xs" color="fg.subtle">
                          Hour
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          min={0}
                          max={23}
                          value={cycleState.hour}
                          onChange={(e) => patchCycle({ hour: Number(e.target.value) })}
                        />
                      </Field.Root>
                      <Field.Root maxW="80px">
                        <Field.Label fontSize="2xs" color="fg.subtle">
                          Minute
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          min={0}
                          max={59}
                          value={cycleState.minute}
                          onChange={(e) => patchCycle({ minute: Number(e.target.value) })}
                        />
                      </Field.Root>
                    </>
                  ) : null}
                </HStack>

                <Text fontSize="xs" color="brand.emphasis" mt={2}>
                  {cycleSummary}
                </Text>
                <Text fontSize="xs" fontFamily="mono" color="fg.subtle" mt={1}>
                  Cron: {cron}
                </Text>
              </Box>

              {cycleState.cycle === 'custom' ? (
                <Field.Root>
                  <Field.Label fontSize="xs" color="fg.muted">
                    Custom expression (minute hour dom month dow)
                  </Field.Label>
                  <Input
                    {...fieldStyles}
                    fontFamily="mono"
                    value={cycleState.custom}
                    onChange={(e) => patchCycle({ custom: e.target.value })}
                  />
                </Field.Root>
              ) : null}

              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
                  Execute user
                </Field.Label>
                <Input {...fieldStyles} value="panel (gateway scheduler)" readOnly />
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
                  Prompt template
                </Field.Label>
                <NativeSelect.Root {...fieldStyles} size="sm">
                  <NativeSelect.Field
                    value={promptId}
                    onChange={(e) => setPromptId(e.target.value)}
                  >
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
                  Agent message
                </Field.Label>
                <Textarea
                  {...fieldStyles}
                  rows={4}
                  placeholder="Instructions sent to the gateway agent on each run"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field.Root>

              <Checkbox.Root
                checked={enabled}
                onCheckedChange={(e) => setEnabled(!!e.checked)}
                size="sm"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label fontSize="sm">
                  Enable schedule (running on server cron)
                </Checkbox.Label>
              </Checkbox.Root>

              <Text fontSize="xs" color="fg.subtle" lineHeight="short">
                Stored in{' '}
                <Text as="span" fontFamily="mono">
                  config/agent_schedules.json
                </Text>
                . The server scheduler runs enabled tasks each minute; use Execute for an immediate
                run.
              </Text>
            </VStack>
          </Drawer.Body>

          <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
            <Button
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              colorPalette="green"
              borderRadius="input"
              loading={saving}
              disabled={!name.trim() || !message.trim()}
              onClick={() => void handleConfirm()}
            >
              Confirm
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  )
}
