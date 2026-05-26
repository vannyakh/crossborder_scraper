import {
  Box,
  Button,
  Checkbox,
  Field,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import {
  useAgentSchedulesQuery,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useGatewayPromptsQuery,
  useRunScheduleNowMutation,
  useUpdateScheduleMutation,
} from '../../hooks'

const CRON_PRESETS = [
  { label: 'Every 30 min', value: '*/30 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily 09:00', value: '0 9 * * *' },
  { label: 'Weekly Mon', value: '0 0 * * 1' },
  { label: 'Custom…', value: '__custom__' },
]

export function AgentSchedulesPanel() {
  const schedulesQuery = useAgentSchedulesQuery()
  const promptsQuery = useGatewayPromptsQuery()
  const createMutation = useCreateScheduleMutation()
  const updateMutation = useUpdateScheduleMutation()
  const deleteMutation = useDeleteScheduleMutation()
  const runNowMutation = useRunScheduleNowMutation()

  const [name, setName] = useState('Catalog monitor')
  const [cronPreset, setCronPreset] = useState('0 9 * * *')
  const [cronCustom, setCronCustom] = useState('0 9 * * *')
  const cron = cronPreset === '__custom__' ? cronCustom : cronPreset
  const [promptId, setPromptId] = useState('catalog_monitor')
  const [message, setMessage] = useState(
    'Run catalog and marketplace health snapshot. Report actions needed.',
  )

  const schedules = schedulesQuery.data?.items ?? []
  const prompts = promptsQuery.data?.items ?? []

  async function handleCreate() {
    await createMutation.mutateAsync({
      name,
      cron,
      prompt_id: promptId,
      message,
      enabled: true,
    })
  }

  return (
    <Section title="Cron schedules" description="Background agent tasks with libs/prompts system prompts" mt={0}>
      <SectionCard mb={4}>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          New cron schedule
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Name
            </Field.Label>
            <Input {...fieldStyles} value={name} onChange={(e) => setName(e.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Cron
            </Field.Label>
            <NativeSelect.Root {...fieldStyles} size="sm">
              <NativeSelect.Field
                value={cronPreset}
                onChange={(e) => setCronPreset(e.target.value)}
              >
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                    {p.value !== '__custom__' ? ` (${p.value})` : ''}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
          {cronPreset === '__custom__' ? (
            <Field.Root gridColumn={{ md: '1 / -1' }}>
              <Field.Label fontSize="xs" color="fg.muted">
                Custom cron expression
              </Field.Label>
              <Input
                {...fieldStyles}
                fontFamily="mono"
                value={cronCustom}
                onChange={(e) => setCronCustom(e.target.value)}
                placeholder="0 9 * * *"
              />
            </Field.Root>
          ) : null}
          <Field.Root gridColumn={{ md: '1 / -1' }}>
            <Field.Label fontSize="xs" color="fg.muted">
              Prompt (libs/prompts)
            </Field.Label>
            <NativeSelect.Root {...fieldStyles} size="sm">
              <NativeSelect.Field value={promptId} onChange={(e) => setPromptId(e.target.value)}>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root gridColumn={{ md: '1 / -1' }}>
            <Field.Label fontSize="xs" color="fg.muted">
              Agent message
            </Field.Label>
            <Textarea {...fieldStyles} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field.Root>
        </SimpleGrid>
        <Button
          size="sm"
          mt={3}
          colorPalette="blue"
          borderRadius="input"
          loading={createMutation.isPending}
          onClick={() => void handleCreate()}
        >
          Add schedule
        </Button>
      </SectionCard>

      <SectionCard>
        {schedules.length === 0 ? (
          <Text fontSize="sm" color="fg.muted">
            No schedules — copy config/agent_schedules.example.json or create one above.
          </Text>
        ) : (
          schedules.map((s) => (
            <Box
              key={s.id}
              p={3}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="input"
              bg="bg.subtle"
            >
              <HStack justify="space-between" flexWrap="wrap" gap={2} mb={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {s.name}
                </Text>
                <HStack gap={2}>
                  <StatusBadge
                    status={s.last_status === 'success' ? 'success' : s.last_status === 'failed' ? 'danger' : 'neutral'}
                    label={s.last_status ?? 'idle'}
                  />
                  <Checkbox.Root
                    checked={s.enabled}
                    onCheckedChange={(e) =>
                      void updateMutation.mutateAsync({ id: s.id, enabled: !!e.checked })
                    }
                    size="sm"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontSize="xs">On</Checkbox.Label>
                  </Checkbox.Root>
                </HStack>
              </HStack>
              <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                {s.cron} · {s.prompt_id}
              </Text>
              {s.next_run_at ? (
                <Text fontSize="xs" color="fg.subtle" mt={1} lineClamp={1} truncate>
                  Next: {s.next_run_at}
                  {s.last_run_at ? ` · Last: ${s.last_run_at}` : ''}
                </Text>
              ) : null}
              {s.last_error ? (
                <Text fontSize="xs" color="red.500" mt={1} lineClamp={2}>
                  {s.last_error}
                </Text>
              ) : null}
              <HStack mt={2} gap={2}>
                <Button
                  size="xs"
                  variant="outline"
                  borderRadius="input"
                  loading={runNowMutation.isPending}
                  onClick={() => void runNowMutation.mutateAsync(s.id)}
                >
                  Run now
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => void deleteMutation.mutateAsync(s.id)}
                >
                  Delete
                </Button>
              </HStack>
            </Box>
          ))
        )}
      </SectionCard>
    </Section>
  )
}
